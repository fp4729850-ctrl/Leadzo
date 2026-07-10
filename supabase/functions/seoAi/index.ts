export const handler = async (req: Request) => {
  // SEO logic goes here
  return new Response(JSON.stringify({ status: "success" }), { headers: { "Content-Type": "application/json" } });
};
