// Test file to verify Gemini 3 Flash Preview API
import { GoogleGenerativeAI } from "@google/generative-ai";

// Load environment variables
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testGeminiAPI() {
  console.log("🧪 Testing Gemini 3.0 Flash Preview API...");
  
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("❌ GEMINI_API_KEY not found in environment");
    return;
  }
  
  console.log("🔑 API Key found, initializing Gemini...");
  
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3.0-flash-preview-1227" });
    
    const prompt = "Hello! Please respond with a simple JSON object containing a greeting message.";
    
    console.log("🚀 Sending test prompt...");
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.8,
        maxOutputTokens: 1000,
      },
    });
    
    const response = await result.response;
    const text = response.text();
    
    console.log("✅ Success! Response received:");
    console.log("📄 Response:", text);
    console.log("🎉 Gemini 3.0 Flash Preview is working correctly!");
    
  } catch (error) {
    console.error("❌ API Test Failed:", error);
    
    if (error.message?.includes('404')) {
      console.error("💡 Suggestion: The model name 'gemini-3.0-flash-preview-1227' might not be available. Try these alternatives:");
      console.error("  - gemini-3.0-flash-preview");
      console.error("  - gemini-3.0-flash");
      console.error("  - gemini-pro");
    }
  }
}

// Run the test
testGeminiAPI().catch(console.error);