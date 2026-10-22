// Deterministic stand-in for Gemini: an e-mail gets the labels that appear in its text
const keywordClassifier = async (body, labels) =>
  labels.filter((label) => body.toLowerCase().includes(label.toLowerCase()));

module.exports = { keywordClassifier };
