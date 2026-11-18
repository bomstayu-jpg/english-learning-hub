import express from "express";
import multer from "multer";
import OpenAI from "openai";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import dotenv from "dotenv";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.resolve("data");
fs.mkdirSync(DATA_DIR, {recursive:true});
const DB = path.join(DATA_DIR, "progress.json");
if (!fs.existsSync(DB)) fs.writeFileSync(DB, JSON.stringify({students:{},sessions:[]}, null, 2));
const readDB=()=>JSON.parse(fs.readFileSync(DB,"utf8"));
const writeDB=(d)=>fs.writeFileSync(DB,JSON.stringify(d,null,2));
const openai = process.env.OPENAI_API_KEY ? new OpenAI({apiKey:process.env.OPENAI_API_KEY}) : null;
const upload = multer({storage:multer.memoryStorage(),limits:{fileSize:24*1024*1024}});
app.use(express.json({limit:"1mb"}));
app.use(express.static("public"));
app.get("/vocab.json",(req,res)=>res.sendFile(path.resolve("vocab.json")));

const vocab = JSON.parse(fs.readFileSync("vocab.json","utf8"));
const vocabText = vocab.map(v=>`${v[0]}: ${v[1]}`).join("; ");
const lessons = `
Unit: BACK TO NATURE – Save Our Bees and Adapting Animals. Grade 11 ESL, CEFR A2.
Lesson 1: Reading and comprehension about bees, pollination, threats to bees, and why biodiversity matters. Teach learners to identify the main idea, find details, infer meaning and support answers with evidence.
Lesson 2: Grammar – Zero Conditional (If + present simple, present simple) for facts; First Conditional (If + present simple, will + base verb) for real future possibilities. Example: If bees disappear, some plants lose pollinators. If we plant native flowers, we will help bees.
Lesson 3: Online research and short presentation: choose an animal affected by climate change; explain the threat, adaptations and one realistic solution; use reliable sources and present clearly.
Lesson 4: Environmental problem dialogue writing: identify a problem, ask follow-up questions, suggest solutions, respond politely, and use target vocabulary.
Final project: 120–150-word interview/dialogue about helping an animal survive climate-change effects. Include peer assessment and a separate teacher answer key in the teacher materials.
Vocabulary: ${vocabText}
`;
const systemPrompt = `You are Maor, a friendly male English-speaking practice partner for Grade 11 ESL students at A2 level. You are warm, patient, encouraging and natural. Speak mainly in simple, clear English at A2 level. The learner is practising the unit ${lessons}.
Rules: have a genuinely open conversation, not a fixed script. Respond specifically to what the student says, ask one natural follow-up question at a time, and keep replies concise (1–3 short sentences). Give the student time and confidence. Do not over-correct every error. When there is an important grammar or vocabulary error, first respond to the meaning, then give a gentle correction in a separate short line: "A better way to say it: ...". If the learner asks for help, explain simply and give an example. Encourage target vocabulary and Zero/First Conditional naturally. Do not invent student performance data. Never claim to hear pronunciation from text alone. If the student uses Hebrew, briefly clarify in simple Hebrew only if needed, then return to English. Keep conversation safe and age-appropriate.`;

app.get("/api/health",(req,res)=>res.json({ok:true,ai:!!openai,voice:!!openai}));
app.post("/api/chat", async (req,res)=>{
  try{
    if(!openai) return res.status(503).json({error:"AI is not configured. The site owner must add OPENAI_API_KEY to the server environment."});
    const {messages=[],studentName="Student",topic="Free conversation"}=req.body||{};
    const safe=messages.slice(-16).filter(m=>["user","assistant"].includes(m.role)).map(m=>({role:m.role,content:String(m.content||"").slice(0,2500)}));
    const r=await openai.responses.create({model:process.env.OPENAI_MODEL||"gpt-5.5",instructions:systemPrompt+`\nStudent name: ${String(studentName).slice(0,60)}. Current topic: ${String(topic).slice(0,100)}.`,input:safe});
    res.json({reply:r.output_text||"Sorry, I didn't catch that. Could you say it again?"});
  }catch(e){console.error(e);res.status(500).json({error:"Maor could not answer right now. Please try again."});}
});
app.post("/api/voice-feedback",upload.single("audio"),async(req,res)=>{
  try{
    if(!openai) return res.status(503).json({error:"AI is not configured on this server."});
    if(!req.file) return res.status(400).json({error:"No audio recording was received."});
    const audioFile=new File([req.file.buffer],req.file.originalname||"student.webm",{type:req.file.mimetype||"audio/webm"});
    const tr=await openai.audio.transcriptions.create({model:"gpt-transcribe",file:audioFile,languages:["en"],prompt:"English language learner speaking about bees, climate change, animals, habitats, adaptation and environmental solutions. Vocabulary: "+vocab.map(x=>x[0]).join(", ")});
    const transcript=tr.text||"";
    const analysis=await openai.responses.create({
      model:process.env.OPENAI_MODEL||"gpt-5.5",
      instructions:`You are an expert but encouraging ESL teacher for Grade 11 A2 learners. Evaluate only evidence available from the transcript and the supplied audio duration. Do not claim phoneme-level or accent accuracy because this workflow provides a transcription, not a dedicated pronunciation scoring model. Return concise JSON only with keys: correctedVersion (string), strengths (array of strings), grammarTip (string), vocabularyTip (string), fluencyEstimate (string), pronunciationNote (string), nextPractice (string), CEFRNote (string). FluencyEstimate may discuss length, pauses only if supported by duration and transcript, and completeness; state uncertainty. pronunciationNote must explain that transcript alone cannot reliably score individual sounds, but can note whether speech was successfully understood.`,
      input:`Student transcript: ${transcript}\nRecording duration seconds: ${Number(req.body.duration||0)}\nUnit: ${lessons}\nGive practical A2 feedback. Be kind and specific.`
    });
    let feedback;
    try{feedback=JSON.parse(analysis.output_text)}catch{feedback={correctedVersion:transcript,strengths:[analysis.output_text],grammarTip:"Review the corrected sentence.",vocabularyTip:"Try to use unit vocabulary.",fluencyEstimate:"Not enough data for a reliable fluency estimate.",pronunciationNote:"The transcript was understood, but individual sounds cannot be scored from text alone.",nextPractice:"Say your corrected sentence again.",CEFRNote:"Practice at A2 level."}}
    res.json({transcript,feedback});
  }catch(e){console.error(e);res.status(500).json({error:"We could not analyse this recording. Please try again or type your answer."});}
});
app.post("/api/progress", (req,res)=>{
  const {studentId,name,event,unit,score,detail}=req.body||{};
  if(!studentId||!name||!event) return res.status(400).json({error:"Student ID, name and event are required."});
  const db=readDB(); const id=String(studentId).trim().slice(0,40); const now=new Date().toISOString();
  db.students[id] ||= {id,name:String(name).slice(0,80),createdAt:now,events:[]};
  db.students[id].name=String(name).slice(0,80);
  db.students[id].events.push({at:now,event:String(event).slice(0,50),unit:String(unit||"Back to Nature").slice(0,80),score:Number.isFinite(Number(score))?Number(score):null,detail:String(detail||"").slice(0,500)});
  db.students[id].events=db.students[id].events.slice(-500);
  writeDB(db); res.json({ok:true});
});
app.get("/api/teacher/progress",(req,res)=>{
  const pass=req.headers["x-teacher-password"];
  if(!process.env.TEACHER_PASSWORD || pass!==process.env.TEACHER_PASSWORD) return res.status(401).json({error:"Teacher password is incorrect."});
  const db=readDB();
  res.json({students:Object.values(db.students).map(s=>({...s,events:s.events.slice(-100)}))});
});
app.listen(PORT,()=>console.log(`Maor ESL site running on http://localhost:${PORT}`));
