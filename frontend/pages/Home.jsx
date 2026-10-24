import { Link } from "react-router-dom";
import "./Home.css";

export default function Home() {
    return (
        <section className="home-page" aria-labelledby="home-title">
            <div className="home-intro">
                <span className="home-label">Spam message checker</span>
                <h1 id="home-title">SpamChecker</h1>
                <p>
                    Check a message with the model, compare Standard and Advanced mode,
                    and review the result without needing to understand the machine
                    learning details.
                </p>
                <div className="home-actions">
                    <Link className="primary-link" to="/analyzer">
                        Start checking
                    </Link>
                    <Link className="secondary-link" to="/about">
                        View project details
                    </Link>
                </div>
            </div>

            <aside className="home-panel" aria-label="Project quick facts">
                <h2>What it checks</h2>
                <ul>
                    <li>Single messages or batch input.</li>
                    <li>Standard Mode and Advanced Mode.</li>
                    <li>Results, charts, and export options.</li>
                </ul>
                <div className="home-data">
                    <span>Training data</span>
                    <strong>123,673 cleaned messages</strong>
                </div>
            </aside>
        </section>
    );
}
