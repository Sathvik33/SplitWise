import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface Anomaly {
  row_index: number;
  original_data: any;
  anomaly_type: string;
  description: string;
  proposed_action: string;
  options: string[];
}

interface ImportReport {
  total_rows: number;
  clean_rows: any[];
  anomalies: Anomaly[];
}

interface ImportReportEntry {
  row_index: string;
  description: string;
  anomaly_type: string;
  resolution: string;
  note: string;
}

type Phase = 'upload' | 'review' | 'report';

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [resolvedAnomalies, setResolvedAnomalies] = useState<Record<number, string>>({});
  const [manualValues, setManualValues] = useState<Record<number, string>>({});
  const [importReport, setImportReport] = useState<ImportReportEntry[]>([]);
  const [importMessage, setImportMessage] = useState('');
  const [phase, setPhase] = useState<Phase>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setIsAnalyzing(true);
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/import/analyze`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${localStorage.getItem('splitwise_token')}`
          }
        }
      );
      setReport(response.data);
      setPhase('review');
      
      // Pre-select the proposed action for all anomalies
      const initialResolutions: Record<number, string> = {};
      response.data.anomalies.forEach((a: Anomaly) => {
        initialResolutions[a.row_index] = a.proposed_action;
      });
      setResolvedAnomalies(initialResolutions);
      
    } catch (err) {
      console.error(err);
      alert("Analysis failed. Please check the console.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleResolutionChange = (rowIndex: number, action: string) => {
    setResolvedAnomalies(prev => ({
      ...prev,
      [rowIndex]: action
    }));
  };

  const handleManualValueChange = (rowIndex: number, value: string) => {
    setManualValues(prev => ({
      ...prev,
      [rowIndex]: value
    }));
  };

  const handleExecute = async () => {
    if (!report) return;
    setIsExecuting(true);

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/import/execute`,
        {
          clean_rows: report.clean_rows,
          resolutions: resolvedAnomalies,
          anomalies: report.anomalies,
          manual_values: manualValues
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('splitwise_token')}`
          }
        }
      );
      setImportMessage(response.data.message || 'Import complete!');
      setImportReport(response.data.import_report || []);
      setPhase('report');
    } catch (err) {
      console.error(err);
      alert("Execution failed.");
    } finally {
      setIsExecuting(false);
    }
  };

  const needsManualInput = (rowIndex: number) => resolvedAnomalies[rowIndex] === 'REQUIRE_MANUAL_INPUT';

  const downloadCSV = () => {
    const headers = ["Description", "Anomaly", "Action Taken", "Details"];
    const csvContent = [
      headers.join(","),
      ...importReport.map(entry => {
        const description = `"${(entry.description || '').replace(/"/g, '""')}"`;
        const anomaly = `"${(entry.anomaly_type || 'None').replace(/"/g, '""')}"`;
        const resolution = `"${(entry.resolution || '').replace(/"/g, '""')}"`;
        const note = `"${(entry.note || '').replace(/"/g, '""')}"`;
        return [description, anomaly, resolution, note].join(",");
      })
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "import_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Upload Phase
  if (phase === 'upload') {
    return (
      <div className="mx-auto max-w-5xl p-4 sm:p-8">
        <div className="mb-10 text-center sm:text-left">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Import Expenses</h1>
          <p className="mt-1 text-sm text-gray-500">Upload your legacy CSV spreadsheet to migrate to the new platform.</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center shadow-sm ring-1 ring-gray-900/5">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-indigo-50">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <h3 className="mt-6 text-xl font-bold text-gray-900">Upload CSV File</h3>
          <p className="mt-2 text-sm text-gray-500">Select expenses_export.csv to begin analysis</p>
          <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
          <div className="mt-8 flex justify-center gap-4">
            <button onClick={() => fileInputRef.current?.click()} className="rounded-xl bg-gray-100 px-6 py-3 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-200">
              {file ? file.name : "Select File"}
            </button>
            <button onClick={handleAnalyze} disabled={!file || isAnalyzing} className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50">
              {isAnalyzing ? "Analyzing..." : "Analyze File"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Review Phase
  if (phase === 'review' && report) {
    return (
      <div className="mx-auto max-w-5xl p-4 sm:p-8">
        <div className="mb-10 text-center sm:text-left">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Review Anomalies</h1>
          <p className="mt-1 text-sm text-gray-500">Meera: "Clean up the duplicates — but I want to approve anything the app deletes or changes."</p>
        </div>

        {/* Summary banner */}
        <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-6 shadow-sm mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100 text-yellow-600">⚠️</div>
            <h3 className="text-lg font-bold text-yellow-800">Data Anomalies Detected</h3>
          </div>
          <p className="mt-2 text-sm text-yellow-700">
            Analyzed {report.total_rows} rows: {report.clean_rows.length} clean, {report.anomalies.length} anomalies found.
            Review each anomaly below and select your resolution policy.
          </p>
        </div>

        {/* Clean rows summary */}
        {report.clean_rows.length > 0 && (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-4 shadow-sm mb-6">
            <p className="text-sm font-medium text-green-800">
              ✅ {report.clean_rows.length} rows will be imported cleanly (no anomalies detected).
            </p>
          </div>
        )}

        {/* Anomalies list */}
        <div className="grid gap-4">
          {report.anomalies.map((anomaly, idx) => (
            <div key={idx} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10">
                      Row {anomaly.row_index}
                    </span>
                    <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-600/10">
                      {anomaly.anomaly_type}
                    </span>
                  </div>
                  <p className="font-semibold text-gray-900">{anomaly.description}</p>
                  <p className="mt-1 text-sm text-gray-500 font-mono bg-gray-50 p-2 rounded">
                    {anomaly.original_data.Description} | {anomaly.original_data["Paid By"]} | ₹{anomaly.original_data.Amount} | Split: {anomaly.original_data["Split With"]}
                  </p>
                </div>
                
                <div className="shrink-0 sm:w-64 space-y-2">
                  <label className="block text-xs font-medium text-gray-500">Resolution Action</label>
                  <select 
                    value={resolvedAnomalies[anomaly.row_index]}
                    onChange={(e) => handleResolutionChange(anomaly.row_index, e.target.value)}
                    className="block w-full rounded-lg border-0 py-2 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm"
                  >
                    {anomaly.options.map(opt => (
                      <option key={opt} value={opt}>{opt.replace(/_/g, ' ')}</option>
                    ))}
                  </select>

                  {/* Manual input field — appears when REQUIRE_MANUAL_INPUT is selected */}
                  {needsManualInput(anomaly.row_index) && (
                    <input
                      type="text"
                      placeholder="Enter corrected value..."
                      value={manualValues[anomaly.row_index] || ''}
                      onChange={(e) => handleManualValueChange(anomaly.row_index, e.target.value)}
                      className="block w-full rounded-lg border-0 py-2 pl-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm"
                    />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-4 mt-8">
          <button onClick={() => { setReport(null); setPhase('upload'); }} className="rounded-xl bg-gray-100 px-6 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-200">
            Cancel
          </button>
          <button onClick={handleExecute} disabled={isExecuting} className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50">
            {isExecuting ? "Executing Import..." : "Approve & Import"}
          </button>
        </div>
      </div>
    );
  }

  // Import Report Phase
  if (phase === 'report') {
    return (
      <div className="mx-auto max-w-5xl p-4 sm:p-8">
        <div className="mb-10 text-center sm:text-left">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Import Report</h1>
          <p className="mt-1 text-sm text-gray-500">{importMessage}</p>
        </div>

        <div className="rounded-2xl border border-green-200 bg-green-50 p-6 shadow-sm mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-600">✅</div>
            <h3 className="text-lg font-bold text-green-800">Import Complete</h3>
          </div>
          <p className="mt-2 text-sm text-green-700">
            Every anomaly has been handled according to your resolution policy. Below is the full audit trail.
          </p>
        </div>

        {/* Report Table */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Anomaly</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action Taken</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {importReport.map((entry, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">{entry.description || '—'}</td>
                  <td className="px-4 py-3">
                    {entry.anomaly_type ? (
                      <span className="inline-flex items-center rounded-md bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-800 ring-1 ring-inset ring-yellow-600/10">
                        {entry.anomaly_type}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">None</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                      entry.resolution === 'SKIP' || entry.resolution === 'FAILED' 
                        ? 'bg-red-50 text-red-700 ring-red-600/10' 
                        : 'bg-green-50 text-green-700 ring-green-600/10'
                    }`}>
                      {entry.resolution}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{entry.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end gap-4 mt-8">
          <button onClick={downloadCSV} className="rounded-xl bg-green-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-green-700">
            Download CSV Report
          </button>
          <button onClick={() => navigate('/dashboard')} className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700">
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return null;
}
