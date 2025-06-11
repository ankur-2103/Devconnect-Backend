import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || ""; // Set in .env
const RAPIDAPI_URL = "https://chatgpt-42.p.rapidapi.com/gpt4";

export const generateSocialMediaPost = async (
  userMessage: string
): Promise<any> => {
  try {
    const response = await axios.post<any>(
      RAPIDAPI_URL,
      {
        messages: [
          {
            role: "user",
            content: `Generate a post on given content (In quill html formate & it should be able to insert directly into body dont start with html tag) don't add anything else on text & content. Content: ${userMessage}`,
          },
        ],
        web_access: false,
      }, // request body
      {
        headers: {
          "Content-Type": "application/json",
          "x-rapidapi-key": RAPIDAPI_KEY,
          "x-rapidapi-host": "chatgpt-42.p.rapidapi.com",
        },
      }
    );

    // The API might return data directly
    const postContent = response.data?.result || response.data;
    // Remove ```html and ``` markers if they exist
    const cleanedContent = postContent.replace(/^```html\n?|\n?```$/g, '');
    return cleanedContent;
  } catch (error) {
    console.error("Error generating social media post:", error);
    throw new Error("Failed to generate social media post");
  }
};
