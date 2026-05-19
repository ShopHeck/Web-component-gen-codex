const raw = "change price of basic plan to $15";
const priceMatch = raw.match(/(?:change|set|make)\s+(?:the\s+)?(?:price\s+of\s+)?([a-zA-Z0-9\-\s]+?)\s+(?:price\s+)?to\s+([$€£\d]+(?:\/\w+)?)/i);
console.log("priceMatch:", priceMatch);
if (priceMatch) {
  const planName = priceMatch[1].replace(/(?:plan|cards?)/gi, '').trim();
  const priceVal = priceMatch[2].trim();
  console.log("planName:", planName);
  console.log("priceVal:", priceVal);
}
