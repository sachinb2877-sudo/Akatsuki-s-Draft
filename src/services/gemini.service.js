import { GoogleGenAI, createUserContent, createPartFromUri } from '@google/genai';
import { env } from '../config/env.js';
import ApiError from '../utils/ApiError.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

const INSTRUCTION = 
  'Improve the attached article\'s grammar, clarity, structure and flow. ' +
  'Preserve the original meaning, facts, tone and language. ' +
  'Do not add new claims. Return ONLY the improved text with no preface or commentary.';

/**
 * Improve content using Gemini API.
 * Primary: upload content as a text file, then generate.
 * Fallback: send content inline if upload fails.
 */
export async function improveContent(content) {
  if (!content || content.trim().length === 0) {
    throw new ApiError(400, 'Content is empty – nothing to improve');
  }

  let tempFilePath = null;
  let improvedText = null;

  try {
    // Try the file-upload approach first
    try {
      // Write content to a temp file
      tempFilePath = path.join(os.tmpdir(), `akatsuki-draft-${Date.now()}.txt`);
      fs.writeFileSync(tempFilePath, content, 'utf-8');

      // Upload to Gemini Files API
      const uploadedFile = await ai.files.upload({
        file: tempFilePath,
        config: {
          mimeType: 'text/plain',
          displayName: `draft-${Date.now()}.txt`,
        },
      });

      // Generate improved content using the uploaded file
      const response = await ai.models.generateContent({
        model: env.GEMINI_MODEL,
        contents: createUserContent([
          createPartFromUri(uploadedFile.uri, uploadedFile.mimeType),
          INSTRUCTION,
        ]),
      });

      improvedText = response.text;
    } catch (uploadError) {
      // Fallback: send content inline
      console.error('[Gemini] File upload failed, falling back to inline content:', uploadError.message);

      const response = await ai.models.generateContent({
        model: env.GEMINI_MODEL,
        contents: createUserContent([
          content,
          INSTRUCTION,
        ]),
      });

      improvedText = response.text;
    }

    // Validate the response
    if (!improvedText || improvedText.trim().length === 0) {
      throw new ApiError(502, 'AI returned an empty response – please try again later');
    }

    return improvedText.trim();
  } catch (error) {
    // If it's already our ApiError, re-throw
    if (error instanceof ApiError) {
      throw error;
    }

    // Handle specific API errors
    if (error.status === 429 || error.message?.includes('429') || error.message?.toLowerCase().includes('quota') || error.message?.toLowerCase().includes('rate')) {
      throw new ApiError(503, 'AI service rate limit exceeded – please try again later');
    }

    if (error.message?.toLowerCase().includes('timeout') || error.code === 'ETIMEDOUT') {
      throw new ApiError(503, 'AI service timed out – please try again later');
    }

    console.error('[Gemini] AI service error:', error.message);
    throw new ApiError(502, 'AI service is unavailable – please try again later');
  } finally {
    // Clean up temp file
    if (tempFilePath) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}
