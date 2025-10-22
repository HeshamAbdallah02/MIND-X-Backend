// backend/models/FormSubmission.mjs
// Model for storing form responses
import mongoose from 'mongoose';

const answerSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  question: {
    type: String,
    required: true
  },
  questionType: {
    type: String,
    required: true
  },
  answer: {
    type: mongoose.Schema.Types.Mixed, // Can be string, number, array, etc.
    required: true
  }
}, { _id: false });

const formSubmissionSchema = new mongoose.Schema({
  formId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Form',
    required: true,
    index: true
  },
  
  // Submitter information
  submitter: {
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    name: {
      type: String,
      trim: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    ipAddress: {
      type: String
    }
  },
  
  // Answers
  answers: [answerSchema],
  
  // Metadata
  submittedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  userAgent: {
    type: String
  }
}, {
  timestamps: true,
  collection: 'formSubmissions'
});

// Indexes
formSubmissionSchema.index({ formId: 1, submittedAt: -1 });
formSubmissionSchema.index({ 'submitter.email': 1, formId: 1 });

// Increment form submission count after save
formSubmissionSchema.post('save', async function() {
  const Form = mongoose.model('Form');
  await Form.findByIdAndUpdate(this.formId, { $inc: { submissionCount: 1 } });
});

export default mongoose.model('FormSubmission', formSubmissionSchema);
