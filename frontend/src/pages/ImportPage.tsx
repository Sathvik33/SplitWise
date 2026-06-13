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

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [resolvedAnomalies, setResolvedAnomalies] = useState<Record<number, string>>({});
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

  const handleExecute = async () => {
    if (!report) return;
    setIsExecuting(true);

    try {
      await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/import/execute`,
        {
          clean_rows: report.clean_rows,
          resolutions: resolvedAnomalies,
          anomalies: report.anomalies
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('splitwise_token')}`
          }
        }
      );
      alert("Import Successful! All anomalies handled according to your policy.");
      navigate('/');
    } catch (err) {
      console.error(err);
      alert("Execution failed.");
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-8">
      <div className="mb-10 text-center sm:text-left">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Import Expenses</h1>
        <p className="mt-1 text-sm text-gray-500">Upload your old legacy CSV spreadsheet to migrate to the new platform.</p>
      </div>

      {!report ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center shadow-sm ring-1 ring-gray-900/5">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-indigo-50">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <h3 className="mt-6 text-xl font-bold text-gray-900">Upload CSV File</h3>
          <p className="mt-2 text-sm text-gray-500">Must be named expenses_export.csv</p>
          
          <input 
            type="file" 
            accept=".csv" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleFileChange}
          />
          
          <div className="mt-8 flex justify-center gap-4">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="rounded-xl bg-gray-100 px-6 py-3 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-200"
            >
              {file ? file.name : "Select File"}
            </button>
            <button 
              onClick={handleAnalyze}
              disabled={!file || isAnalyzing}
              className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50"
            >
              {isAnalyzing ? "Analyzing..." : "Analyze File"}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100 text-yellow-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-yellow-800">Review Data Anomalies</h3>
            </div>
            <p className="mt-2 text-sm text-yellow-700">
              We analyzed {report.total_rows} rows and found {report.anomalies.length} anomalies. 
              Review the automated fixes below before executing the import.
            </p>
          </div>

          <div className="grid gap-4">
            {report.anomalies.map((anomaly, idx) => (
              <div key={idx} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <span className="mb-2 inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10">
                      Row {anomaly.row_index} : {anomaly.anomaly_type}
                    </span>
                    <p className="font-semibold text-gray-900">{anomaly.description}</p>
                    <p className="mt-1 text-sm text-gray-500 font-mono bg-gray-50 p-2 rounded">
                      Data: {JSON.stringify(anomaly.original_data)}
                    </p>
                  </div>
                  
                  <div className="shrink-0 sm:w-64">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Resolution Action</label>
                    <select 
                      value={resolvedAnomalies[anomaly.row_index]}
                      onChange={(e) => handleResolutionChange(anomaly.row_index, e.target.value)}
                      className="block w-full rounded-lg border-0 py-2 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    >
                      {anomaly.options.map(opt => (
                        <option key={opt} value={opt}>{opt.replace(/_/g, ' ')}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-4 mt-8">
            <button 
              onClick={() => setReport(null)}
              className="rounded-xl bg-gray-100 px-6 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-200"
            >
              Cancel
            </button>
            <button 
              onClick={handleExecute}
              disabled={isExecuting}
              className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              {isExecuting ? "Executing Import..." : "Approve & Import"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
