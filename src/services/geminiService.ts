import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: "AIzaSyAsResMJh1bpMFK28zrkOgO6UH9qS2kDdU" });

export interface VisualStepData {
  part_name: string;
  action: string;
  connection_point?: string;
  target_part?: string;
}

export interface ScrapProjectResponse {
  project_title: string;
  components_list: string[];
  steps: string[];
  visual_step_data: VisualStepData[];
}

export async function processScrapImage(base64Image: string): Promise<ScrapProjectResponse> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          {
            text: `[CRITICAL INSTRUCTION: VISUAL TRIAGE & REJECTION PROTOCOL]
            Before generating any blueprints, you MUST act as a strict gatekeeper. Analyze the uploaded image.

            Valid Materials: You may ONLY proceed if the image explicitly contains electronic scrap, hardware components, mechanical parts, wires, PCBs, or tools.

            Invalid Materials: If the image contains organic matter (fruit, food, plants, people, animals), clothing, landscapes, or everyday non-hardware items, you MUST reject the input. Do not attempt to create "bio-batteries" or creative solutions.

            If the image is INVALID, you MUST return this exact JSON structure and nothing else:
            {
              "project_title": "[ ERROR_CODE: INVALID_MATERIAL ]",
              "components_list": [
                "Error: No usable silicon detected", 
                "Error: No mechanical scrap detected"
              ],
              "steps": [
                "SYSTEM REJECTION PROTOCOL INITIATED.",
                "The visual stream does not contain acceptable e-waste or hardware.",
                "Please recalibrate your camera and upload an image of valid electronic scrap, motors, or circuitry."
              ],
              "visual_step_data": []
            }

            If the image is VALID, proceed with the following protocol:

            Analyze the provided image of electronic waste or spare parts. 
            Identify usable components and suggest ONE clever, functional DIY project that can be built using these parts.
            
            CORE PROTOCOLS:
            1. GAP_ANALYSIS: Perform a technical deduction of missing components required to make the project functional (e.g., power sources, specific fasteners, circuits). Append " (Required)" to any item in the components_list that is not visible in the image but necessary for the build.
            2. GRANULAR_BLUEPRINT: Provide highly detailed, physical micro-steps for assembly. Do not group complex actions. Aim for 6 to 12+ steps to ensure technical precision.
            3. VISUAL_SYNC: Ensure visual_step_data strictly maps to the expanded step count.

            Return the result in the following JSON structure:
            {
              "project_title": "A creative title for the project",
              "components_list": ["Part A", "Part B", "9V Battery (Required)"],
              "steps": ["Step 1: Prepare...", "Step 2: Connect...", ... "Step N: Finalize..."],
              "visual_step_data": [
                {
                  "part_name": "name of part in this step",
                  "action": "attach/solder/connect/place",
                  "connection_point": "where to connect it (optional)",
                  "target_part": "the part it connects to (optional)"
                }
              ]
            }
            Ensure steps and visual_step_data have the same length and correspond to each other.`,
          },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image,
            },
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          project_title: { type: Type.STRING },
          components_list: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          steps: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          visual_step_data: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                part_name: { type: Type.STRING },
                action: { type: Type.STRING },
                connection_point: { type: Type.STRING },
                target_part: { type: Type.STRING },
              },
              required: ["part_name", "action"],
            },
          },
        },
        required: ["project_title", "components_list", "steps", "visual_step_data"],
      },
    },
  });

  return JSON.parse(response.text || "{}");
}
