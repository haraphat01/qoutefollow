import OpenAI from "openai";

export async function extractTextFromPdfWithOpenAi(
  buffer: Buffer,
  fileName: string,
) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const openai = new OpenAI({ apiKey });
  const file = await openai.files.create({
    file: new File([new Uint8Array(buffer)], fileName, {
      type: "application/pdf",
    }),
    purpose: "user_data",
  });

  const response = await openai.responses.create({
    model: "gpt-4o-mini",
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text:
              "This PDF may be a scanned contractor estimate. Transcribe all readable text from the document. Return plain text only, preserving line breaks where helpful.",
          },
          {
            type: "input_file",
            file_id: file.id,
          },
        ],
      },
    ],
  });

  const text = response.output_text?.trim() ?? "";
  if (!text) {
    throw new Error("OCR did not return any text");
  }

  return text;
}
