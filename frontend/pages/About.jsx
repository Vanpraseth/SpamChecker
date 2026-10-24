import React from "react";
import "./About.css";

const metrics = [
    ["Standard Mode", "Logistic Regression", "97.34%"],
    ["Advanced Mode", "Random Forest", "98.64%"],
];

export default function About() {
    return (
        <section className="about-page" aria-labelledby="about-title">
            <div className="about-main">
                <span className="eyebrow">About</span>
                <h1 id="about-title">About SpamChecker</h1>

                <p>
                    SpamChecker is a personal machine-learning project I built to check
                    whether a message looks like spam or safe. I wanted the app to feel
                    simple to use, so the main page focuses on pasting a message and
                    reading the result.
                </p>

                <h2>How it works</h2>
                <ol>
                    <li>The message is sent from the React interface to the FastAPI backend.</li>
                    <li>The backend cleans the text and prepares it for the model.</li>
                    <li>TF-IDF turns the text into features the model can understand.</li>
                    <li>The selected saved model predicts whether it is spam or safe.</li>
                    <li>The app shows the result as spam or safe, with simple charts and export options.</li>
                </ol>

                <h2>Dataset and models</h2>
                <p>
                    I trained the models using 123,673 cleaned labelled messages, including
                    60,185 spam examples. The data came from SMS, Enron, SpamAssassin,
                    MENTHOS, and a small hard-example set. Duplicate rows were removed
                    during cleaning.
                </p>
                <p>
                    Standard Mode uses Logistic Regression. Advanced Mode uses Random
                    Forest. The accuracy values below are evaluation results from the saved
                    metrics, so they do not guarantee every prediction will be correct.
                </p>

                <div className="about-metrics" aria-label="Model accuracy results">
                    {metrics.map(([mode, model, accuracy]) => (
                        <div key={mode}>
                            <strong>{mode}</strong>
                            <span>{model}</span>
                            <b>{accuracy}</b>
                        </div>
                    ))}
                </div>

                <h2>One thing to keep in mind</h2>
                <p>
                    SpamChecker can make mistakes, especially with new or unusual spam
                    messages. It should not replace professional security analysis, and
                    users should not paste passwords, private information, or sensitive
                    messages into the app.
                </p>
            </div>

            <aside className="about-side" aria-label="Project details">
                <h2>Project notes</h2>
                <dl>
                    <div>
                        <dt>Project type</dt>
                        <dd>Independent portfolio project</dd>
                    </div>
                    <div>
                        <dt>Frontend</dt>
                        <dd>React, Vite, and page styling</dd>
                    </div>
                    <div>
                        <dt>Backend</dt>
                        <dd>FastAPI, Python</dd>
                    </div>
                    <div>
                        <dt>ML workflow</dt>
                        <dd>TF-IDF and saved models</dd>
                    </div>
                    <div>
                        <dt>Features</dt>
                        <dd>Single check, batch mode, model switching, simple charts, exports</dd>
                    </div>
                </dl>
                <p>
                    I implemented the interface, backend connection, model workflow, and
                    result display for this project.
                </p>
            </aside>
        </section>
    );
}
