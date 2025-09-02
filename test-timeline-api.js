// backend/test-timeline-api.js
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000';

const testTimelineAPI = async () => {
  console.log('Testing Timeline API endpoints...\n');
  
  try {
    // Test 1: GET /api/timeline
    console.log('Test 1: Fetching all timeline data...');
    const response = await axios.get(`${API_BASE_URL}/api/timeline`);
    
    if (response.status === 200) {
      console.log('✅ Success! Status:', response.status);
      console.log('Data structure:');
      console.log('- Sections:', response.data.sections?.length || 0);
      console.log('- Phases:', response.data.phases?.length || 0);
      
      if (response.data.sections?.length > 0) {
        console.log('\nFirst section:', {
          id: response.data.sections[0].id,
          title: response.data.sections[0].title,
          subtitle: response.data.sections[0].subtitle
        });
      }
      
      if (response.data.phases?.length > 0) {
        console.log('\nFirst phase:', {
          id: response.data.phases[0].id,
          year: response.data.phases[0].year,
          headline: response.data.phases[0].headline
        });
      }
    }
    
    // Test 2: GET /api/timeline/sections
    console.log('\n\nTest 2: Fetching timeline sections...');
    const sectionsResponse = await axios.get(`${API_BASE_URL}/api/timeline/sections`);
    
    if (sectionsResponse.status === 200) {
      console.log('✅ Success! Status:', sectionsResponse.status);
      console.log('Sections found:', sectionsResponse.data.length);
    }
    
    // Test 3: GET /api/timeline/sections/:sectionId/phases
    if (response.data.sections?.length > 0) {
      const sectionId = response.data.sections[0].id;
      console.log(`\n\nTest 3: Fetching phases for section ${sectionId}...`);
      const phasesResponse = await axios.get(`${API_BASE_URL}/api/timeline/sections/${sectionId}/phases`);
      
      if (phasesResponse.status === 200) {
        console.log('✅ Success! Status:', phasesResponse.status);
        console.log('Phases found:', phasesResponse.data.length);
      }
    }
    
    console.log('\n\n✅ All timeline API tests passed successfully!');
    console.log('The timeline API is now working properly.');
    
  } catch (error) {
    console.error('❌ Error testing timeline API:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Message:', error.response.data?.message || error.message);
    } else if (error.request) {
      console.error('No response received. Is the backend server running?');
    } else {
      console.error('Error:', error.message);
    }
  }
};

// Run the test
testTimelineAPI();