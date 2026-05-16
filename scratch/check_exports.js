import * as genai from "@google/genai";
const keys = Object.keys(genai);
console.log("SchemaType exists:", keys.includes("SchemaType"));
console.log("Type exists:", keys.includes("Type"));
console.log("All keys starting with S or T:", keys.filter(k => k.startsWith("S") || k.startsWith("T")));
