let modelPromise;


function tokenize(text, stopWords) {
    const words = text.toLowerCase().match(/[\p{L}\p{N}_]{2,}/gu) || [];
    const tokens = words.filter((word) => !stopWords.has(word));
    const terms = [...tokens];
    for (let index = 0; index < tokens.length - 1; index += 1) {
        terms.push(`${tokens[index]} ${tokens[index + 1]}`);
    }
    return terms;
}


function sigmoid(value) {
    if (value >= 0) return 1 / (1 + Math.exp(-value));
    const exp = Math.exp(value);
    return exp / (1 + exp);
}


export function predictFromModelData(text, model, threshold = 0.5) {
    const stopWords = new Set(model.stop_words);
    const counts = new Map();
    tokenize(text, stopWords).forEach((term) => {
        if (Object.hasOwn(model.vocabulary, term)) {
            counts.set(term, (counts.get(term) || 0) + 1);
        }
    });

    const weighted = [];
    let squaredNorm = 0;
    counts.forEach((count, term) => {
        const index = model.vocabulary[term];
        const value = count * model.idf[index];
        weighted.push([index, value]);
        squaredNorm += value * value;
    });

    const norm = Math.sqrt(squaredNorm) || 1;
    let decision = model.intercept;
    weighted.forEach(([index, value]) => {
        decision += (value / norm) * model.coefficients[index];
    });

    const probSpam = sigmoid(decision);
    const predictedLabel = probSpam >= threshold ? "spam" : "ham";
    return {
        predicted_label: predictedLabel,
        confidence: predictedLabel === "spam" ? probSpam : 1 - probSpam,
        threshold_used: threshold,
        model: "logistic_regression",
        prob_spam: probSpam,
    };
}


async function loadBrowserModel() {
    if (!modelPromise) {
        const modelUrl = `${import.meta.env.BASE_URL}models/browser_logistic_model.json`;
        modelPromise = fetch(modelUrl).then((response) => {
            if (!response.ok) throw new Error("The browser demo model could not be loaded.");
            return response.json();
        });
    }
    return modelPromise;
}


export async function predictWithBrowserModel(text, threshold = 0.5) {
    const model = await loadBrowserModel();
    return predictFromModelData(text, model, threshold);
}
