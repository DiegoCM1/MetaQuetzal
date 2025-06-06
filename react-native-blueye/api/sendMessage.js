import axios from "axios";

const API_URL = "https://ai-blueye-production.up.railway.app/ask"; // ✅ replace with your actual deployed URL

export const sendMessage = async (question) => {
  try {
    const response = await axios.post(API_URL, { question });
    return response.data.response;
  } catch (error) {
    console.error("AI Request Error:", error.response?.data || error.message);
    return "Lo siento, ocurrió un error al contactar al asistente.";
  }
};
