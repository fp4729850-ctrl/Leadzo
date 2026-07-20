const test = async () => {
  const content = Buffer.from('Client Name,Phone Number,Due Date,Amount / Context\nRahul Sharma,+919876543210,2026-07-25,₹15000 Insurance Premium').toString('base64');
  
  try {
    const res = await fetch("https://stbqeiapgdaklktrlrjm.supabase.co/functions/v1/aiReminders_parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileData: content,
        mimeType: "text/csv"
      })
    });
    
    console.log("Status:", res.status);
    console.log("Text:", await res.text());
  } catch (e) {
    console.error("Fetch failed:", e);
  }
};
test();
