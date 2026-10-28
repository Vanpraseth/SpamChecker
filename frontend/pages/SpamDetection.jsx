import React, { useMemo, useState } from "react";
import {
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Container,
    Divider,
    IconButton,
    Menu,
    MenuItem,
    Stack,
    TextField,
    Tooltip,
    Typography,
    Alert,
	LinearProgress,
    FormControlLabel,
    Switch,
	useMediaQuery,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
} from "@mui/material";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import ScienceRoundedIcon from "@mui/icons-material/ScienceRounded";
import BugReportRoundedIcon from "@mui/icons-material/BugReportRounded";
import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import FileUploadOutlinedIcon from "@mui/icons-material/FileUploadOutlined";
import SaveAltRoundedIcon from "@mui/icons-material/SaveAltRounded";
//components
import BatchCharts from "../src/components/spam/BatchCharts";
import BatchTable from "../src/components/spam/BatchTable";
import SingleResultCharts from "../src/components/spam/SingleResultCharts";
import { predictWithBrowserModel } from "../src/demoModel";

//charts
import {
	Chart as ChartJS,
	ArcElement,
	Tooltip as ChartTooltip,
	Legend,
	CategoryScale,
	LinearScale,
	BarElement,
	PointElement,
	LineElement,
} from "chart.js";
import { Doughnut, Bar, Line } from "react-chartjs-2";

ChartJS.register(
	ArcElement,
	ChartTooltip,
	Legend,
	CategoryScale,
	LinearScale,
	BarElement,
	PointElement,
	LineElement
);

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";

//runtime boundary to avoid black screen
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, info) {
        console.error("UI error:", error, info);
    }
    render() {
        if (this.state.hasError) {
            const message = this.state.error?.message || String(this.state.error || "Unknown error");
            return (
                <Alert severity="error" sx={{ mt: 2 }}>
                    <strong>Something went wrong rendering this section.</strong>
                    <br />
                    {message}
                </Alert>
            );
        }
        return this.props.children;
    }
}

//handles all the user input, backend comms, and model results
export default function SpamDetection() {
    const isSmallScreen = useMediaQuery("(max-width:599.95px)");
    const [text, setText] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [batchMode, setBatchMode] = useState(false);
    const [batchResults, setBatchResults] = useState([]);
    const [error, setError] = useState("");
    const [warnings, setWarnings] = useState([]);
    const [backendReady, setBackendReady] = useState(false);
    const [model, setModel] = useState("logistic_regression");
	const [batchProgress, setBatchProgress] = useState(0);
	const [, setSseStatus] = useState('connecting');
	const [lastEventTs, setLastEventTs] = useState(null);
	const [canRetry, setCanRetry] = useState(false);
	const [exportMenuAnchor, setExportMenuAnchor] = useState(null);

	const canSubmit = useMemo(() => text.trim().length > 0 && !loading, [text, loading]);

    const examples = [
        {
            label: "Likely Spam",
            text: "URGENT: Your delivery is on hold due to an unpaid fee. Confirm your details and pay $2.99 now: http://delivery-check.example",
            icon: <BugReportRoundedIcon fontSize="small" />,
        },
        {
            label: "Likely Safe",
            text: "Hi Alex, the project meeting has been moved to Thursday at 2:00 PM in Room 4. Please let me know if you cannot attend.",
            icon: <EmailRoundedIcon fontSize="small" />,
        },
    ];

		const actionIconStyle = {
		border: "1px solid rgba(156,178,214,0.22)",
			color: "#f5f7fb",
			background: "#101622",
			alignSelf: "center",
			borderRadius: 1.5,
			width: 44,
			height: 44,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				transition: "160ms ease",
			'&:hover': {
				background: '#151d2b',
				borderColor: '#20d6b5',
				color: '#5eead4',
				transform: 'translateY(-1px)',
				boxShadow: '0 8px 16px rgba(0,0,0,0.24)',
			},
		'&.Mui-disabled': {
			color: '#667085',
			opacity: 0.6,
		},
		};

    const modelLabels = {
        logistic_regression: "Standard Mode",
        random_forest: "Advanced Mode",
    };

  	//health check to avoid back end reloads
    React.useEffect(() => {
        if (DEMO_MODE) {
            setBackendReady(true);
            return undefined;
        }
        let cancelled = false;
        async function pingHealth(retries = 3) {
            for (let i = 0; i < retries; i++) {
                try 
				{
                    const res = await fetch(`${API_BASE}/health`, { method: "GET" });
                    if (res.ok) {
                        if (!cancelled) setBackendReady(true);
                        return;
                    }
                } 
					catch 
					{
	                    // Health check retry handles temporary backend startup misses.
	                }
                await new Promise((r) => setTimeout(r, 500 * (i + 1)));
            }
            if (!cancelled) setBackendReady(false);
        }
        pingHealth();
        return () => {
            cancelled = true;
        };
    }, []);

	const [batchLabelFilter, setBatchLabelFilter] = useState("all");

	//live update for server responses
	React.useEffect(() => {
		if (DEMO_MODE) return undefined;
		const src = new EventSource(`${API_BASE}/api/events`);
		const onMsg = (e) => {
			try {
				const data = JSON.parse(e.data);
				if (data && data.ts) setLastEventTs(new Date(data.ts * 1000).toISOString());
			} catch {
				setLastEventTs(new Date().toISOString());
			}
		};

			src.onmessage = onMsg;
		src.onopen = () => setSseStatus('open');
		src.onerror = () => setSseStatus('connecting'); //auto-reconnect
		return () => src.close();
	}, []);

	function mapHttpError(status, detail) {
		if (status === 400) return detail || "Validation error. Please check inputs or threshold.";
		if (status === 404) return detail || "Requested model or resource not found. Try reloading models.";
		if (status === 413) return detail || "Batch too large for server limits.";
		if (status >= 500) return detail || "Server error. Please try again shortly.";
		return detail || `Request failed with status ${status}.`;
	}

	async function requestPrediction(message) {
		if (DEMO_MODE) {
			if (model !== "logistic_regression") {
				throw new Error("Advanced Mode is available when the full backend runs locally.");
			}
			return predictWithBrowserModel(message);
		}
		const res = await fetch(`${API_BASE}/api/predict_text`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ texts: [message], model }),
		});
		if (!res.ok) {
			let detail = "";
			try {
				const body = await res.json();
				detail = body?.detail || "";
			} catch {
				// Fall back to status-based error text when the response is not JSON.
			}
			throw new Error(mapHttpError(res.status, detail));
		}
		return res.json();
	}

	function validateInput(currentText, isBatch) {
		const warn = [];
		if (!currentText || currentText.trim().length === 0) return { warn };
		if (!isBatch) {
			const maxLen = 20000;
			if (currentText.length > maxLen) {
				return { error: `Message is too long (${currentText.length} chars). Max allowed is ${maxLen}.` };
			}
			const words = currentText.trim().split(/\s+/).length;
			if (words > 2000) warn.push(`Large message detected (~${words} words). Processing may be slower.`);
			return { warn };
		}
		const lines = currentText.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
		if (lines.length === 0) return { error: "No valid lines found. Enter one message per line." };
		const limit = 200;
		if (lines.length > limit) warn.push(`Batch contains ${lines.length} lines. Only the first ${limit} will be processed.`);
		const dupCount = lines.length - new Set(lines).size;
		if (dupCount > 0) warn.push(`${dupCount} duplicate line(s) detected.`);
		const longest = lines.reduce((m, s) => Math.max(m, s.length), 0);
		if (longest > 10000) warn.push("One or more lines are very long (>10k chars). Consider splitting.");
		return { warn };
	}

    async function handleDetect() {
        if (!text.trim()) {
            setError("Please enter a message first.");
            return;
        }
        setError("");
        setLoading(true);
        setResult(null);
        setBatchResults([]);
        setBatchLabelFilter("all");

	try {
        //ping backend before sending message to make sure tha it is ready
        if (!backendReady) {
            try {
                const h = await fetch(`${API_BASE}/health`);
                if (h.ok) setBackendReady(true);
            } catch {
                // Submit can still run and show the request error if health is unavailable.
            }
        }
        //validates the input for any errors
        const v = validateInput(text, batchMode);
        if (v?.error) {
            setError(v.error);
            setWarnings([]);
            setLoading(false);
            setCanRetry(true);
            return;
        }
        setWarnings(v.warn || []);
        if (batchMode) {
            const lines = text
                .split(/\r?\n/)
                .map((s) => s.trim())
                .filter((s) => s.length > 0);
            if (lines.length === 0) {
                setError("No valid lines found. Enter one message per line.");
                return;
            }
            //prevent large runs meaning that only 200 items will be processed (200 lines if csv or txt)
            const limit = 200;
            const items = lines.slice(0, limit);

            //concurrency limited mapping
            const concurrency = 5;
            let idx = 0;
            const out = new Array(items.length);
            let completed = 0;

            async function worker() {
                while (idx < items.length) {
                    const i = idx++;
                    const msg = items[i];
                    try {
                        const data = await requestPrediction(msg);
                        const wordCount = msg.trim().split(/\s+/).length;
                        const summary = generateSummary(msg);
                        out[i] = {
                            index: i + 1,
                            text: msg,
                            model: data.model ?? model,
                            predicted_label: data.predicted_label,
                            confidence: data.confidence,
                            prob_spam: data.prob_spam,
                            threshold_used: data.threshold_used,
                            wordCount,
                            summary,
                        };
                    } catch (err) {
                        out[i] = {
                            index: i + 1,
                            text: msg,
                            model,
                            predicted_label: "error",
                            confidence: 0,
                            prob_spam: null,
                            threshold_used: null,
                            wordCount: msg.trim().split(/\s+/).length,
                            summary: String(err?.message || err || "error"),
                        };
                    }
                    completed += 1;
                    //partial updaates are pushed
                    setBatchResults([...out]);
                    setBatchProgress(completed / items.length);
                }
            }

            await Promise.all(new Array(concurrency).fill(0).map(() => worker()));
            setBatchResults(out);
            setBatchProgress(1);

            //skip single messages
            return;
        }
        const data = await requestPrediction(text);

        const wordCount = text.trim().split(/\s+/).length;
        const summary = generateSummary(text);

        setResult({ ...data, wordCount, summary });
    } catch (e) {
        console.error(e);
        setError(String(e?.message || e || "Unknown error"));
        setCanRetry(true);
    } finally {
        setLoading(false);
    }
}

    function handleClear() {
        setText("");
        setResult(null);
        setBatchResults([]);
        setBatchLabelFilter("all");
        setError("");
				setWarnings([]);
				setBatchProgress(0);
				setCanRetry(false);
    }

    function exportCSV() {
        if (!batchResults || batchResults.length === 0) return;
        const cols = [
            "index",
            "text",
            "predicted_label",
            "confidence",
            "prob_spam",
            "threshold_used",
            "model",
            "wordCount",
            "summary",
        ];
        const header = cols.join(",");
        const rows = batchResults.map((r) =>
            cols
                .map((k) => {
                    const v = r[k];
                    const s = v === null || v === undefined ? "" : String(v);
                    //wraps in quotes if needed
                    const needsQuote = s.includes(",") || s.includes("\n") || s.includes("\"");
                    const esc = s.replaceAll("\"", '""');
                    return needsQuote ? `"${esc}"` : esc;
                })
                .join(",")
        );
        const csv = [header, ...rows].join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "spam_detection_results.csv";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

	//large batches can be exported via JSON or csv
	function exportJSON() {
		if (!batchResults || batchResults.length === 0) return;
		const payload = {
				meta: {
					model,
					generated_at: new Date().toISOString(),
				total: batchResults.length,
			},
			results: batchResults,
		};
		const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = "spam_detection_results.json";
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

    async function handleUploadFile(evt) {
        const file = evt.target.files?.[0];
        if (!file) return;
        setError("");
        const isCSV = file.name.toLowerCase().endsWith(".csv");
        const isTXT = file.name.toLowerCase().endsWith(".txt");

    if (isTXT) {
        const reader = new FileReader();
        reader.onload = () => {
            const content = String(reader.result || "");
            const lines = content
                .split(/\r?\n/)
                .map((s) => s.trim())
                .filter((s) => s.length > 0);
            if (lines.length === 0) {
                setError("The uploaded file appears to be empty.");
                return;
            }
            setBatchMode(true);
            setText(lines.join("\n"));
        };
        reader.onerror = () => setError("Failed to read the file.");
        reader.readAsText(file);
        return;
    }

    if (isCSV) {
        const Papa = (await import("papaparse")).default;
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                try {
                    const rows = Array.isArray(results.data) ? results.data : [];
                    if (rows.length === 0) {
                        setError("No rows found in the CSV.");
                        return;
                    }
                    //chooses the text if it is available
                    const texts = [];
                    for (const row of rows) {
                        if (!row || typeof row !== "object") continue;
                        let val = null;
                        if (Object.prototype.hasOwnProperty.call(row, "text")) {
                            val = row["text"];
                        } else {
                            //find the first non-empty string
                            for (const key of Object.keys(row)) {
                                const v = row[key];
                                if (typeof v === "string" && v.trim().length > 0) {
                                    val = v;
                                    break;
                                }
                            }
                        }
                        if (typeof val === "string" && val.trim().length > 0) {
                            texts.push(val.trim());
                        }
                    }
                    if (texts.length === 0) {
                        setError("Could not find a 'text' column or non-empty values in the CSV.");
                        return;
                    }
                    setBatchMode(true);
                    setText(texts.join("\n"));
                } catch (err) {
                    setError("CSV parsing error: " + String(err?.message || err));
                }
            },
            error: (err) => setError("CSV parsing failed: " + String(err?.message || err)),
        });
        return;
    }

        setError("Unsupported file type. Please upload .txt or .csv");
    }

    function generateSummary(input) {
        const sentences = input.split(/[.!?]/).filter((s) => s.trim().length > 0);
        if (sentences.length === 0) return "No meaningful content found.";
        if (sentences.length === 1) return sentences[0].trim();
        const firstTwo = sentences.slice(0, 2).map((s) => s.trim());
        return firstTwo.join(". ") + ".";
    }

		const resultColors =
    result?.predicted_label === "spam"
		? { bg: "rgba(255,92,122,0.13)", fg: "#ff8fa3", chip: "error" }
		: { bg: "rgba(32,214,181,0.12)", fg: "#66ffe3", chip: "success" };

		//charts to be exported
		const doughnutRef = React.useRef(null);
		const confidenceRef = React.useRef(null);
		const riskRef = React.useRef(null);

		function exportChartsCombinedPNG() {
			const chartObjs = [doughnutRef.current, confidenceRef.current, riskRef.current].filter(Boolean);
			if (chartObjs.length === 0) return;
			//get underlying canvases
			const canvases = chartObjs
				.map((ch) => ch?.canvas || ch?.ctx?.canvas || null)
				.filter(Boolean);
			if (canvases.length === 0) return;
			const pad = 25; 
			const gap = 15; 
			const totalWidth = canvases.reduce((sum, c) => sum + c.width, 0) + gap * (canvases.length - 1) + pad * 2;
			const maxHeight = Math.max(...canvases.map((c) => c.height));
			const totalHeight = maxHeight + pad * 2;
			const out = document.createElement("canvas");
			out.width = totalWidth;
			out.height = totalHeight;
			const ctx = out.getContext("2d");

			//set background of export to match the color of the system
			ctx.fillStyle = "#101622";
			ctx.fillRect(0, 0, totalWidth, totalHeight);

			//draw each chart
			let x = pad;
			canvases.forEach((c) => {
				const y = pad + Math.floor((maxHeight - c.height) / 2);
				ctx.drawImage(c, x, y);
				x += c.width + gap;
			});
			const dataUrl = out.toDataURL("image/png");
			const a = document.createElement("a");
			a.href = dataUrl;
			a.download = "charts_combined.png";
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
		}

		//export the handlers
		const handleOpenExportMenu = (e) => setExportMenuAnchor(e.currentTarget);
		const handleCloseExportMenu = () => setExportMenuAnchor(null);

		//prepares data for the charts
		const {
			doughnutData,
			confidenceData,
			riskData,
			chartOptions,
			confidenceOptions,
			riskOptions,
		} = useMemo(() => {
			if (!result) {
				return {
					doughnutData: null,
					confidenceData: null,
					riskData: null,
					chartOptions: {},
					confidenceOptions: {},
					riskOptions: {},
				};
			}

			//confidence may come as 0..1; fallback to 0.5
			const conf = typeof result.confidence === "number" ? result.confidence : 0.5;
			const isSpam = result.predicted_label === "spam";
			const spamScore = isSpam ? conf : 1 - conf;
			const hamScore = 1 - spamScore;

			const doughnutData = {
				labels: ["Spam chance", "Safe chance"],
				datasets: [
					{
						data: [spamScore * 100, hamScore * 100],
						backgroundColor: ["#ff5c7a", "#20d6b5"],
					},
				],
			};

			const confidenceData = {
				labels: ["Model confidence"],
				datasets: [
					{
						label: "Confidence",
						data: [conf * 100],
						backgroundColor: isSpam ? "#ff5c7a" : "#20d6b5",
					},
				],
			};

			const riskLevel =
				spamScore < 0.31 ? "Low" : spamScore < 0.71 ? "Medium" : "High";
			const riskData = {
				labels: ["Low", "Medium", "High"],
				datasets: [
					{
						label: "Risk",
						data: [
							riskLevel === "Low" ? spamScore * 100 : 0,
							riskLevel === "Medium" ? spamScore * 100 : 0,
							riskLevel === "High" ? spamScore * 100 : 0,
						],
						backgroundColor: ["#20d6b5", "#fbbf24", "#ff5c7a"],
					},
				],
			};

			const chartOptions = {
				plugins: {
					legend: {
						labels: { color: "#f5f7fb" },
					},
				},
			};

			const confidenceOptions = {
				indexAxis: "y",
				scales: {
					x: {
						min: 0,
						max: 100,
						ticks: { color: "#f5f7fb" },
						grid: { color: "rgba(156,178,214,0.08)" },
					},
					y: {
						ticks: { color: "#f5f7fb" },
						grid: { display: false },
					},
				},
				plugins: {
					legend: { display: false },
				},
			};

			const riskOptions = {
				indexAxis: "y",
				scales: {
					x: {
						min: 0,
						max: 100,
						ticks: { color: "#f5f7fb" },
						grid: { color: "rgba(156,178,214,0.08)" },
					},
					y: {
						ticks: { color: "#f5f7fb" },
						grid: { display: false },
					},
				},
				plugins: {
					legend: { display: false },
				},
			};

			return { doughnutData, confidenceData, riskData, chartOptions, confidenceOptions, riskOptions };
			}, [result]);

			//interactive plotly data
			const plotlySingle = useMemo(() => {
			if (!result) return null;
			const conf = typeof result.confidence === "number" ? result.confidence : 0.5;
			const derivedProb = result.predicted_label === "spam" ? conf : 1 - conf;
			const spamProb = typeof result.prob_spam === "number" ? result.prob_spam : derivedProb;
				const thresholdUsed =
					typeof result.threshold_used === "number"
						? result.threshold_used
						: 0.5;
			return {
				spamProb,
				thresholdUsed,
				wordCount: result.wordCount || 0,
			};
			}, [result]);

		//filters the results dynamically by spam probability
			const filteredBatch = useMemo(() => {
				if (!batchResults || batchResults.length === 0) return [];
				return batchResults.filter((r) => {
					if (!r || typeof r !== 'object') return false;
					if (batchLabelFilter === "all") return true;
					if (batchLabelFilter === "spam") return r.predicted_label === "spam";
					if (batchLabelFilter === "safe") return r.predicted_label === "ham";
					return r.predicted_label === "error";
				});
			}, [batchResults, batchLabelFilter]);
			const spamBatchCount = batchResults.filter((r) => r?.predicted_label === "spam").length;
			const safeBatchCount = batchResults.filter((r) => r?.predicted_label === "ham").length;
			const errorBatchCount = batchResults.filter((r) => r?.predicted_label === "error").length;

			const spamProbability = plotlySingle?.spamProb ?? null;
			const spamPercent = typeof spamProbability === "number" ? spamProbability * 100 : null;
			const confidencePercent = typeof result?.confidence === "number" ? result.confidence * 100 : null;
			const isSpamResult = result?.predicted_label === "spam";
			const verdictTitle = isSpamResult ? "Spam detected" : "No spam detected";
			const verdictText = isSpamResult
				? "This message needs extra caution."
				: "No obvious spam signs found.";

  	return (
		<Box
		sx={{
			minHeight: "auto",
			width: "100%",
			background: "transparent",
				display: "flex",
				alignItems: "flex-start",
				justifyContent: "center",
				pt: { xs: 2, sm: 3 },
				px: { xs: 2, sm: 3, md: 5 },
				pb: { xs: 3, md: 5 },
				scrollMarginTop: "80px",
			}}
		id="analyzer"
    >
			<Container maxWidth={false} sx={{ maxWidth: 1180, px: { xs: 0, sm: 2 } }}>
				{DEMO_MODE && (
					<Alert severity="info" sx={{ mb: 2 }}>
						Portfolio demo: Standard Mode runs a lightweight Logistic Regression model in your browser. Advanced Mode is available with the local FastAPI backend.
					</Alert>
				)}
				<Box sx={{ mb: 2.25 }}>
					<Typography variant="h3" sx={{ fontWeight: 750, color: "#f1f5f9", fontSize: { xs: "1.65rem", md: "2rem" } }}>
						Check a message
					</Typography>
					<Typography variant="body1" sx={{ color: "#94a3b8", mt: 0.75, maxWidth: 640 }}>
						Paste a message below and choose how you want the model to check it.
					</Typography>
				</Box>

	        <Card
				sx={{
					maxWidth: 1180,
					mx: "auto",
					background: "#111821",
					border: "1px solid rgba(148,163,184,0.22)",
					borderRadius: 2,
					boxShadow: "none",
				}}
	        >
				<CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
				<Box
					sx={{
						display: "grid",
						gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) 280px" },
						gap: 2,
						alignItems: "start",
						}}
						>
							<Box sx={{ minWidth: 0 }}>
						<Box
							sx={{
								display: "flex",
								justifyContent: "flex-start",
								mb: 1.25,
							}}
						>
							<Box
								sx={{
									display: "grid",
									gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
									width: { xs: "100%", sm: 340 },
									p: 0.4,
									borderRadius: 1.5,
									background: "#0d131d",
									border: "1px solid rgba(156,178,214,0.18)",
								}}
								aria-label="Choose scan mode"
							>
								{Object.entries(modelLabels).map(([value, label]) => {
									const selected = model === value;
									return (
										<Button
											key={value}
											onClick={() => setModel(value)}
										disabled={loading || (DEMO_MODE && value === "random_forest")}
											sx={{
												minHeight: 34,
												px: 1.5,
												borderRadius: 1.25,
												background: selected ? "#2dd4bf" : "transparent",
												color: selected ? "#03110e" : "#cbd5e1",
												fontSize: "0.82rem",
												fontWeight: 800,
												textTransform: "none",
												boxShadow: "none",
												"&:hover": {
													background: selected ? "#5eead4" : "rgba(255,255,255,0.06)",
												},
											}}
										>
											{label}
										</Button>
									);
								})}
							</Box>
						</Box>

	            <TextField
					fullWidth
					multiline
					minRows={batchMode ? (isSmallScreen ? 9 : 14) : (isSmallScreen ? 7 : 12)}
					value={text}
					onChange={(e) => setText(e.target.value)}
					placeholder={
						batchMode
						? "Paste messages here. Use one line for each message."
						: "Paste the message here..."
					}
					sx={{
						"& .MuiOutlinedInput-root": {
							background: "#080b12",
							color: "#f5f7fb",
							borderRadius: 2,
							alignItems: "flex-start",
							"& fieldset": { borderColor: "rgba(148,163,184,0.24)" },
							"&:hover fieldset": { borderColor: "#2dd4bf" },
							"&.Mui-focused fieldset": { borderColor: "#2dd4bf" },
						},
						"& textarea::placeholder": {
							color: "#64748b",
							opacity: 1,
							fontWeight: 650,
						},
	            	}}
	            />
	
				<Stack
					direction={{ xs: "column", md: "row" }}
					alignItems={{ xs: "stretch", md: "center" }}
					justifyContent="space-between"
					spacing={2}
					sx={{ mt: 2 }}
				>
					<Stack
						direction="row"
						spacing={1}
						useFlexGap
						flexWrap="wrap"
						sx={{ width: { xs: "100%", md: "auto" } }}
					>
						{examples.map((ex) => (
							<Chip
								key={ex.label}
								size="small"
								icon={ex.icon}
								label={ex.label}
								onClick={() => setText(ex.text)}
								sx={{
									flex: { xs: "1 1 130px", sm: "0 0 auto" },
									background: "rgba(32,214,181,0.11)",
									color: "#5eead4",
									border: "1px solid rgba(32,214,181,0.28)",
									"&:hover": { background: "rgba(32,214,181,0.18)" },
								}}
							/>
						))}
					</Stack>

					<Stack direction="row" alignItems="center" spacing={1.5}>
						<FormControlLabel
							control={
								<Switch
									checked={batchMode}
									onChange={(e) => setBatchMode(e.target.checked)}
									sx={{
										'& .MuiSwitch-switchBase.Mui-checked': { color: '#2dd4bf' },
										'& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#2dd4bf' },
									}}
								/>
							}
							label={<Typography sx={{ color: "#cbd5e1" }}>Batch mode</Typography>}
						/>
						<Typography variant="caption" sx={{ color: '#73a7ff' }}>
							{lastEventTs ? `${new Date(lastEventTs).toLocaleTimeString()}` : ''}
						</Typography>
					</Stack>
				</Stack>

	            <Stack
					direction={{ xs: "column", sm: "row" }}
					justifyContent="flex-start"
					alignItems={{ xs: "stretch", sm: "center" }}
					spacing={1.25}
					sx={{ mt: 2.25 }}
				>
					<Button
						variant="contained"
						onClick={handleDetect}
						disabled={!canSubmit}
						startIcon={<ScienceRoundedIcon />}
						sx={{
							width: { xs: "100%", sm: 220 },
							minHeight: 44,
							borderRadius: 1.5,
							background: "#2dd4bf",
							color: "#03110e",
								fontWeight: 800,
								textTransform: "none",
								boxShadow: "0 8px 18px rgba(45, 212, 191, 0.18)",
								transition: "160ms ease",
								"&:hover": {
									background: "#5eead4",
									transform: "translateY(-1px)",
									boxShadow: "0 10px 22px rgba(45, 212, 191, 0.28)",
								},
							"&.Mui-disabled": {
								background: "#2dd4bf",
								color: "#03110e",
								opacity: 0.82,
							},
						}}
	              	>
					{loading ? <CircularProgress size={22} color="inherit" aria-label="Scanning" /> : "Check message"}
              	</Button>

				<Stack
					direction="row"
					spacing={1.25}
					justifyContent={{ xs: "center", sm: "flex-start" }}
				>
					<Tooltip title="Clear">
					<IconButton
						aria-label="Clear"
						onClick={handleClear}
						sx={actionIconStyle}
					>
					<DeleteOutlineRoundedIcon />
					</IconButton>
				</Tooltip>

				<Tooltip title="Upload (.txt or .csv)">
					<span>
					<IconButton
							component="label"
							sx={{
								...actionIconStyle,
								border: '1px solid rgba(156,178,214,0.22)',
							}}
					>
						<FileUploadOutlinedIcon />
						<input
						type="file"
						accept=".txt,text/plain,.csv"
						hidden
						onChange={handleUploadFile}
						/>
					</IconButton>
					</span>
				</Tooltip>

				{/* Unified Export Dropdown */}
				<Tooltip title="Export">
					<span>
					<IconButton
						aria-label="Export options"
						onClick={handleOpenExportMenu}
						sx={{ ...actionIconStyle }}
					>
						<SaveAltRoundedIcon />
					</IconButton>
					</span>
				</Tooltip>
				</Stack>
				<Menu
					anchorEl={exportMenuAnchor}
					open={Boolean(exportMenuAnchor)}
					onClose={handleCloseExportMenu}
					anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
					transformOrigin={{ vertical: "top", horizontal: "right" }}
					PaperProps={{
						sx: {
							background: "#101622",
							border: "1px solid rgba(156,178,214,0.22)",
							color: "#f5f7fb",
							'& .MuiMenuItem-root': { color: '#f5f7fb' },
						},
					}}
				>
					<MenuItem
						onClick={() => { exportCSV(); handleCloseExportMenu(); }}
						disabled={!batchResults || batchResults.length === 0}
						sx={{ '&.Mui-disabled': { color: '#6f757d', opacity: 1 } }}
					>
						Export CSV (batch)
					</MenuItem>
					<MenuItem
						onClick={() => { exportJSON(); handleCloseExportMenu(); }}
						disabled={!batchResults || batchResults.length === 0}
						sx={{ '&.Mui-disabled': { color: '#6f757d', opacity: 1 } }}
					>
						Export JSON (batch)
					</MenuItem>
					<MenuItem
						onClick={() => { exportChartsCombinedPNG(); handleCloseExportMenu(); }}
						disabled={batchMode || !result}
						sx={{ '&.Mui-disabled': { color: '#6f757d', opacity: 1 } }}
					>
						Export Charts
					</MenuItem>
					</Menu>

            </Stack>

			{warnings && warnings.length > 0 && (
				<Alert severity="warning" sx={{ mt: 2, background: "rgba(246,185,80,0.13)", color: "#ffd98a", border: "1px solid rgba(246,185,80,0.36)" }}>
					<ul style={{ margin: 0, paddingLeft: 18 }}>
						{warnings.map((w, i) => (
							<li key={i}>{w}</li>
						))}
					</ul>
				</Alert>
			)}
			{error && (
				<Alert severity="error" sx={{ mt: 2, background: "rgba(255,92,122,0.13)", color: "#ff9caf", border: "1px solid rgba(255,92,122,0.36)" }}
					action={canRetry ? (
						<Button color="inherit" size="small" onClick={handleDetect}>
							Retry
						</Button>
					) : undefined}
					>
						{error}
					</Alert>
				)}
					</Box>

					<Box
						sx={{
							minWidth: 0,
							minHeight: { xs: 140, lg: 260 },
							p: 1.75,
							borderRadius: 2,
							background: result && !batchMode ? resultColors.bg : "#101622",
							border: "1px solid rgba(156,178,214,0.18)",
							position: { lg: "sticky" },
							top: { lg: 86 },
						}}
					>
							<Typography variant="overline" sx={{ color: "#5eead4", fontWeight: 750, letterSpacing: 0 }}>
								Check result
						</Typography>

						{loading && (
							<Stack spacing={1.5} sx={{ mt: 2 }}>
								<CircularProgress size={28} sx={{ color: "#2dd4bf" }} />
								<Typography sx={{ color: "#cbd5e1" }}>Analyzing message...</Typography>
							</Stack>
						)}

							{!loading && result && !batchMode && (
								<ErrorBoundary>
									<Stack spacing={1.35} sx={{ mt: 1.2 }}>
										<Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
											<Typography variant="caption" sx={{ color: "#94a3b8" }}>
												{modelLabels[result.model] || "Selected model"}
											</Typography>
											<Chip
												size="small"
												color={resultColors.chip}
												label={isSpamResult ? "Spam" : "Safe"}
											/>
										</Stack>

										<Box>
											<Typography variant="h5" sx={{ color: resultColors.fg, fontWeight: 900, lineHeight: 1.1 }}>
												{verdictTitle}
											</Typography>
											<Typography variant="body2" sx={{ color: "#cbd5e1", mt: 0.75 }}>
												{verdictText}
											</Typography>
										</Box>

										{typeof spamPercent === "number" && (
											<Box>
												<Stack direction="row" justifyContent="space-between" alignItems="center">
													<Typography variant="caption" sx={{ color: "#94a3b8" }}>
														Spam chance
													</Typography>
													<Typography variant="body1" sx={{ color: resultColors.fg, fontWeight: 850 }}>
														{spamPercent.toFixed(1)}%
													</Typography>
												</Stack>
												<LinearProgress
													variant="determinate"
													value={Math.max(0, Math.min(100, spamPercent))}
													sx={{
														mt: 0.75,
														height: 7,
														borderRadius: 999,
														background: "rgba(148,163,184,0.18)",
														"& .MuiLinearProgress-bar": {
															borderRadius: 999,
															background: isSpamResult ? "#fb7185" : "#2dd4bf",
														},
													}}
												/>
											</Box>
										)}

										<Divider sx={{ borderColor: "rgba(156,178,214,0.18)" }} />
										<Stack direction="row" flexWrap="wrap" gap={1}>
											<Chip
												size="small"
												label={`Model sure: ${typeof confidencePercent === "number" ? `${confidencePercent.toFixed(1)}%` : "N/A"}`}
												sx={{ background: "rgba(255,255,255,0.06)", color: "#cbd5e1" }}
											/>
											<Chip
												size="small"
												label={`${result.wordCount} words`}
												sx={{ background: "rgba(255,255,255,0.06)", color: "#cbd5e1" }}
											/>
										</Stack>
									</Stack>
								</ErrorBoundary>
							)}

						{!loading && batchMode && batchResults && batchResults.length > 0 && (
							<Stack spacing={1.5} sx={{ mt: 2 }}>
								<Typography variant="h5" sx={{ color: "#f5f7fb", fontWeight: 800 }}>
									{batchResults.length} checked
								</Typography>
								<Typography variant="body2" sx={{ color: "#cbd5e1" }}>
									Batch results are ready below with charts, filters, and table export.
								</Typography>
							</Stack>
						)}

						{!loading && !result && (!batchResults || batchResults.length === 0) && (
							<Typography variant="body2" sx={{ color: "#94a3b8", mt: 2 }}>
								The result will show here after you check a message.
							</Typography>
						)}
					</Box>
				</Box>
	
				{result && !batchMode && (
								<ErrorBoundary>
					<Box sx={{ mt: 3 }}>
					<SingleResultCharts
						doughnutData={doughnutData}
						confidenceData={confidenceData}
						riskData={riskData}
						chartOptions={chartOptions}
						confidenceOptions={confidenceOptions}
						riskOptions={riskOptions}
						refs={{ doughnutRef, confidenceRef, riskRef }}
					/>
					</Box>
					</ErrorBoundary>
	            )}
			{batchMode && batchResults && batchResults.length > 0 && (
				<ErrorBoundary>
					<Box sx={{ mt: 3 }}>
					{loading && (
						<Box sx={{ mb: 1 }}>
							<LinearProgress variant="determinate" value={Math.round(batchProgress * 100)} />
							<Typography variant="caption" sx={{ color: "#9aa8bd" }}>
								Processing {Math.round(batchProgress * 100)}%
							</Typography>
						</Box>
					)}
					<Typography variant="h6" sx={{ color: "#f5f7fb", mb: 1 }}>
						Batch Results ({filteredBatch.length} / {batchResults.length})
					</Typography>

					<BatchCharts batchResults={batchResults} />

					<Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "stretch", sm: "center" }} spacing={1} sx={{ mb: 2 }}>
						<Typography sx={{ color: "#9aa8bd", mr: { sm: 1 } }}>Show</Typography>
						{[
							["all", `All (${batchResults.length})`],
							["spam", `Spam (${spamBatchCount})`],
							["safe", `Safe (${safeBatchCount})`],
							...(errorBatchCount ? [["error", `Errors (${errorBatchCount})`]] : []),
						].map(([value, label]) => {
							const selected = batchLabelFilter === value;
							return (
								<Button
									key={value}
									size="small"
									onClick={() => setBatchLabelFilter(value)}
									sx={{
										border: "1px solid rgba(156,178,214,0.22)",
										borderColor: selected ? "#2dd4bf" : "rgba(156,178,214,0.22)",
										background: selected ? "rgba(45,212,191,0.13)" : "transparent",
										color: selected ? "#5eead4" : "#cbd5e1",
										textTransform: "none",
										fontWeight: 750,
									}}
								>
									{label}
								</Button>
							);
						})}
					</Stack>
                    <BatchTable rows={filteredBatch} />
					</Box>
				</ErrorBoundary>
            )}
			</CardContent>
			</Card>
		</Container>
    </Box>
  	);
}
