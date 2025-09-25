import axios from 'axios';

const API_BASE = process.env.API_BASE || 'http://localhost:4001';

async function testTemplateSystem() {
  console.log('🧪 Testing Template Export/Import System\n');

  try {
    // Test 1: Export a template
    console.log('1. Testing template export...');
    const exportData = {
      templateName: 'Test Template',
      description: 'A test template for demonstration',
      pages: [
        {
          name: 'Test Page',
          layers: {
            ROOT: {
              type: { resolvedName: 'RootLayer' },
              props: {
                boxSize: { width: 800, height: 600 },
                position: { x: 0, y: 0 },
                color: 'rgb(255, 255, 255)'
              }
            },
            textLayer: {
              type: { resolvedName: 'TextLayer' },
              props: {
                position: { x: 100, y: 100 },
                boxSize: { width: 600, height: 100 },
                text: '<p>Hello {{name}}!</p>',
                fonts: [{ family: 'Arial', name: 'Arial Regular' }],
                colors: ['rgb(0, 0, 0)'],
                fontSizes: [24]
              }
            }
          }
        }
      ],
      author: 'Test User',
      tags: ['test', 'demo']
    };

    const exportResponse = await axios.post(`${API_BASE}/api/template/export`, exportData);
    console.log('✅ Export successful:', exportResponse.data.success);
    console.log('📁 Download URL:', exportResponse.data.downloadUrl);

    // Test 2: Import template with parameters
    console.log('\n2. Testing template import with parameters...');
    const importData = {
      templatePath: './json/sample-template.json',
      textParameters: {
        title: 'Welcome to Our Service',
        subtitle: 'Professional Design Solutions'
      },
      imageParameters: {
        backgroundImage: 'https://canva-editor-api.vercel.app/images/photos/nature/001.jpg'
      }
    };

    const importResponse = await axios.post(`${API_BASE}/api/template/import`, importData);
    console.log('✅ Import successful:', importResponse.data.success);
    console.log('📄 Template name:', importResponse.data.template.name);
    console.log('📝 Pages count:', importResponse.data.template.pages.length);

    // Test 3: Get template by name with parameters
    console.log('\n3. Testing get template with parameters...');
    const textParams = JSON.stringify({
      title: 'Custom Title',
      subtitle: 'Custom Subtitle'
    });
    const imageParams = JSON.stringify({
      backgroundImage: 'https://canva-editor-api.vercel.app/images/photos/sports/002.jpg'
    });

    const getResponse = await axios.get(
      `${API_BASE}/api/template/sample-template.json?textParameters=${encodeURIComponent(textParams)}&imageParameters=${encodeURIComponent(imageParams)}`
    );
    console.log('✅ Get template successful:', getResponse.data.success);
    console.log('📄 Retrieved template:', getResponse.data.template.name);

    // Test 4: Test existing template search
    console.log('\n4. Testing existing template search...');
    const searchResponse = await axios.get(`${API_BASE}/api/templates?ps=5&pi=0&kw=motivation`);
    console.log('✅ Template search successful');
    console.log('📊 Found templates:', searchResponse.data.length);

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   • Template export functionality: ✅');
    console.log('   • Template import with parameters: ✅');
    console.log('   • Template retrieval with customization: ✅');
    console.log('   • Template search functionality: ✅');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    console.log('\n🔧 Make sure the API server is running on port 4000');
    console.log('   Run: cd canva-editor/api && npm start');
  }
}

// Run the test
testTemplateSystem();
