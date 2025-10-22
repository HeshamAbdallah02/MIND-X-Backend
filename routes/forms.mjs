// backend/routes/forms.mjs
// Routes for Form Builder
import express from 'express';
import Joi from 'joi';
import Form from '../models/Form.mjs';
import FormSubmission from '../models/FormSubmission.mjs';
import authMiddleware from '../middleware/auth.mjs';
import asyncHandler from '../middleware/asyncHandler.mjs';

const router = express.Router();

// ==================== PUBLIC ROUTES ====================

/**
 * GET /api/forms/:slug
 * Get published form by slug for public viewing
 */
router.get('/:slug', asyncHandler(async (req, res) => {
  const form = await Form.findOne({ 
    slug: req.params.slug,
    'settings.isPublished': true
  }).lean();
  
  if (!form) {
    return res.status(404).json({ message: 'Form not found or not published' });
  }
  
  // Check if form has deadline and if it's passed
  if (form.settings.deadline && new Date(form.settings.deadline) < new Date()) {
    return res.status(403).json({ message: 'This form is no longer accepting responses' });
  }
  
  // Check if max submissions reached
  if (form.settings.maxSubmissions && form.submissionCount >= form.settings.maxSubmissions) {
    return res.status(403).json({ message: 'This form has reached its maximum number of responses' });
  }
  
  res.json(form);
}));

/**
 * POST /api/forms/:slug/submit
 * Submit a form response (public)
 */
router.post('/:slug/submit', asyncHandler(async (req, res) => {
  const form = await Form.findOne({ 
    slug: req.params.slug,
    'settings.isPublished': true
  });
  
  if (!form) {
    return res.status(404).json({ message: 'Form not found or not published' });
  }
  
  // Check deadline
  if (form.settings.deadline && new Date(form.settings.deadline) < new Date()) {
    return res.status(403).json({ message: 'This form is no longer accepting responses' });
  }
  
  // Check max submissions
  if (form.settings.maxSubmissions && form.submissionCount >= form.settings.maxSubmissions) {
    return res.status(403).json({ message: 'This form has reached its maximum number of responses' });
  }
  
  const { answers, submitter } = req.body;
  
  // Check if multiple submissions allowed
  if (!form.settings.allowMultipleSubmissions && submitter?.email) {
    const existingSubmission = await FormSubmission.findOne({
      formId: form._id,
      'submitter.email': submitter.email
    });
    
    if (existingSubmission) {
      return res.status(403).json({ message: 'You have already submitted a response to this form' });
    }
  }
  
  // Validate required questions
  const requiredQuestions = form.questions.filter(q => q.required);
  const answeredQuestions = answers.map(a => a.questionId.toString());
  
  const missingRequired = requiredQuestions.filter(q => 
    !answeredQuestions.includes(q._id.toString())
  );
  
  if (missingRequired.length > 0) {
    return res.status(400).json({ 
      message: 'Please answer all required questions',
      missing: missingRequired.map(q => q.label)
    });
  }
  
  // Create submission
  const submission = new FormSubmission({
    formId: form._id,
    submitter: {
      email: submitter?.email,
      name: submitter?.name,
      ipAddress: req.ip || req.connection.remoteAddress
    },
    answers,
    userAgent: req.headers['user-agent']
  });
  
  await submission.save();
  
  res.status(201).json({ 
    message: form.settings.confirmationMessage,
    submissionId: submission._id
  });
}));

// ==================== ADMIN ROUTES ====================

/**
 * GET /api/forms/admin/all
 * Get all forms for admin dashboard
 */
router.get('/admin/all', authMiddleware, asyncHandler(async (req, res) => {
  const forms = await Form.find({ createdBy: req.adminId })
    .sort({ createdAt: -1 })
    .lean();
  
  res.json(forms);
}));

/**
 * GET /api/forms/admin/:id
 * Get single form by ID (admin)
 */
router.get('/admin/:id', authMiddleware, asyncHandler(async (req, res) => {
  const form = await Form.findOne({
    _id: req.params.id,
    createdBy: req.adminId
  });
  
  if (!form) {
    return res.status(404).json({ message: 'Form not found' });
  }
  
  res.json(form);
}));

// Validation schema
const formValidation = Joi.object({
  title: Joi.string().required().trim().min(1).max(200),
  description: Joi.string().allow('').max(1000),
  questions: Joi.array().items(
    Joi.object({
      type: Joi.string().valid('text', 'email', 'number', 'tel', 'url', 'textarea', 'select', 'radio', 'checkbox', 'date', 'time', 'datetime', 'file').required(),
      label: Joi.string().required().trim().min(1).max(500),
      description: Joi.string().allow('').max(500),
      placeholder: Joi.string().allow('').max(200),
      required: Joi.boolean(),
      options: Joi.array().items(Joi.string()),
      validation: Joi.object({
        min: Joi.number(),
        max: Joi.number(),
        minLength: Joi.number(),
        maxLength: Joi.number(),
        pattern: Joi.string(),
        accept: Joi.string()
      }),
      order: Joi.number()
    })
  ),
  settings: Joi.object({
    isPublished: Joi.boolean(),
    allowMultipleSubmissions: Joi.boolean(),
    requireLogin: Joi.boolean(),
    showProgressBar: Joi.boolean(),
    submitButtonText: Joi.string().max(50),
    confirmationMessage: Joi.string().max(500),
    deadline: Joi.date().allow(null),
    maxSubmissions: Joi.number().min(0).allow(null),
    collectEmail: Joi.boolean()
  }),
  theme: Joi.object({
    primaryColor: Joi.string().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/),
    backgroundColor: Joi.string().pattern(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
  })
});

/**
 * POST /api/forms/admin
 * Create new form
 */
router.post('/admin', authMiddleware, asyncHandler(async (req, res) => {
  const { error } = formValidation.validate(req.body);
  if (error) {
    return res.status(400).json({ 
      message: 'Validation failed',
      details: error.details.map(d => d.message)
    });
  }
  
  const form = new Form({
    ...req.body,
    createdBy: req.adminId
  });
  
  await form.save();
  res.status(201).json(form);
}));

/**
 * PUT /api/forms/admin/:id
 * Update form
 */
router.put('/admin/:id', authMiddleware, asyncHandler(async (req, res) => {
  const { error } = formValidation.validate(req.body);
  if (error) {
    return res.status(400).json({ 
      message: 'Validation failed',
      details: error.details.map(d => d.message)
    });
  }
  
  const form = await Form.findOneAndUpdate(
    { _id: req.params.id, createdBy: req.adminId },
    req.body,
    { new: true, runValidators: true }
  );
  
  if (!form) {
    return res.status(404).json({ message: 'Form not found' });
  }
  
  res.json(form);
}));

/**
 * PATCH /api/forms/admin/:id/publish
 * Toggle form published status
 */
router.patch('/admin/:id/publish', authMiddleware, asyncHandler(async (req, res) => {
  const form = await Form.findOne({
    _id: req.params.id,
    createdBy: req.adminId
  });
  
  if (!form) {
    return res.status(404).json({ message: 'Form not found' });
  }
  
  form.settings.isPublished = !form.settings.isPublished;
  await form.save();
  
  res.json(form);
}));

/**
 * DELETE /api/forms/admin/:id
 * Delete form and all its submissions
 */
router.delete('/admin/:id', authMiddleware, asyncHandler(async (req, res) => {
  const form = await Form.findOneAndDelete({
    _id: req.params.id,
    createdBy: req.adminId
  });
  
  if (!form) {
    return res.status(404).json({ message: 'Form not found' });
  }
  
  // Delete all submissions for this form
  await FormSubmission.deleteMany({ formId: req.params.id });
  
  res.json({ message: 'Form and all submissions deleted successfully' });
}));

/**
 * GET /api/forms/admin/:id/submissions
 * Get all submissions for a form
 */
router.get('/admin/:id/submissions', authMiddleware, asyncHandler(async (req, res) => {
  // Verify form ownership
  const form = await Form.findOne({
    _id: req.params.id,
    createdBy: req.adminId
  });
  
  if (!form) {
    return res.status(404).json({ message: 'Form not found' });
  }
  
  const submissions = await FormSubmission.find({ formId: req.params.id })
    .sort({ submittedAt: -1 })
    .lean();
  
  res.json({
    form: {
      title: form.title,
      questions: form.questions
    },
    submissions,
    totalSubmissions: submissions.length
  });
}));

/**
 * DELETE /api/forms/admin/:formId/submissions/:submissionId
 * Delete a single submission
 */
router.delete('/admin/:formId/submissions/:submissionId', authMiddleware, asyncHandler(async (req, res) => {
  // Verify form ownership
  const form = await Form.findOne({
    _id: req.params.formId,
    createdBy: req.adminId
  });
  
  if (!form) {
    return res.status(404).json({ message: 'Form not found' });
  }
  
  const submission = await FormSubmission.findOneAndDelete({
    _id: req.params.submissionId,
    formId: req.params.formId
  });
  
  if (!submission) {
    return res.status(404).json({ message: 'Submission not found' });
  }
  
  // Decrement submission count
  await Form.findByIdAndUpdate(req.params.formId, { $inc: { submissionCount: -1 } });
  
  res.json({ message: 'Submission deleted successfully' });
}));

export default router;
