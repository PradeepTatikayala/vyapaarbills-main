import { useState, useEffect } from 'react';
import { 
  PieChart, 
  Download, 
  FileText, 
  Loader2, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  AlertCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { UiCard } from '../components/UiCard';
import { billingService } from '../services/api';

export const ReportsPage = () => {
  const [runs, setRuns] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const fetchRuns = async () => {
    try {
      const data = await billingService.getRuns();
      setRuns(data || []);
    } catch (error) {
      toast.error('Failed to load generation reports.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  const handleDownloadPdf = async (runId: number, monthStr: string) => {
    setDownloadingId(runId);
    try {
      const blob = await billingService.downloadPDF(runId);
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `bills_${monthStr}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success(`PDF report for ${monthStr} downloaded.`);
    } catch (error) {
      toast.error('Failed to download PDF report.');
    } finally {
      setDownloadingId(null);
    }
  };

  // Compute stats
  const totalRuns = runs.length;
  const totalGenerated = runs.reduce((acc, run) => acc + parseFloat(run.generated_amount || '0'), 0);
  const totalTarget = runs.reduce((acc, run) => acc + parseFloat(run.target_amount || '0'), 0);
  const remainingDeficit = Math.max(0, totalTarget - totalGenerated);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-vyapaar-blue w-12 h-12" />
          <p className="text-slate-500 font-semibold">Compiling compliance reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 pb-24 max-w-7xl mx-auto">
      
      {/* Header */}
      <header className="mb-10">
        <h1 className="text-3xl font-black text-vyapaar-text mb-2 flex items-center gap-2">
          <PieChart className="text-vyapaar-blue" size={32} /> GST Compliance Reports
        </h1>
        <p className="text-slate-500 font-medium">Audit historical bill runs, inspect generation statistics, and export PDF compliance records.</p>
      </header>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        
        {/* Total Runs */}
        <UiCard className="p-6 border-t-4 border-t-vyapaar-blue bg-white flex justify-between items-start">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Billing Runs</span>
            <span className="text-3xl font-black text-vyapaar-text mt-2 block">{totalRuns} Run{totalRuns !== 1 ? 's' : ''}</span>
            <span className="text-xs text-slate-400 font-semibold mt-1 block">Saved in compliance archives</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-blue-50 text-vyapaar-blue flex items-center justify-center">
            <Calendar size={20} />
          </div>
        </UiCard>

        {/* Total Generated */}
        <UiCard className="p-6 border-t-4 border-t-vyapaar-emerald bg-white flex justify-between items-start">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Capital Generated</span>
            <span className="text-3xl font-black text-vyapaar-emerald mt-2 block">₹{totalGenerated.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            <span className="text-xs text-slate-400 font-semibold mt-1 block">Accrued across active bills</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-50 text-vyapaar-emerald flex items-center justify-center">
            <TrendingUp size={20} />
          </div>
        </UiCard>

        {/* Total Target */}
        <UiCard className="p-6 border-t-4 border-t-vyapaar-saffron bg-white flex justify-between items-start">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Remaining Target Gap</span>
            <span className="text-3xl font-black text-vyapaar-saffron mt-2 block">₹{remainingDeficit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            <span className="text-xs text-slate-400 font-semibold mt-1 block">Outstanding margin deficit</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-orange-50 text-vyapaar-saffron flex items-center justify-center">
            <TrendingDown size={20} />
          </div>
        </UiCard>

      </div>

      {/* Reports Table / List */}
      <UiCard className="p-6 bg-white border border-slate-100 rounded-2xl">
        <h3 className="font-extrabold text-lg text-vyapaar-text mb-6 flex items-center gap-2">
          <FileText className="text-slate-500" size={20} /> Historical Generation Reports
        </h3>

        {runs.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center justify-center">
            <AlertCircle size={48} className="text-slate-300 mb-3" />
            <h4 className="text-lg font-bold text-slate-700 mb-1">No Generation Runs Found</h4>
            <p className="text-slate-400 text-sm max-w-sm">You haven't generated any bills yet. Head over to the Smart Billing Generator to create your first run.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider bg-slate-50/50">
                  <th className="py-4 px-4 rounded-l-xl">Run Month</th>
                  <th className="py-4 px-4">Entity Details</th>
                  <th className="py-4 px-4 text-right">Target Amount</th>
                  <th className="py-4 px-4 text-right">Generated Amount</th>
                  <th className="py-4 px-4 text-center">Bills Count</th>
                  <th className="py-4 px-4 text-center rounded-r-xl">Export Report</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-vyapaar-text font-semibold text-sm">
                {runs.map((run) => {
                  const monthName = new Date(run.month + '-02').toLocaleString('default', { month: 'long', year: 'numeric' });
                  return (
                    <tr key={run.id} className="hover:bg-slate-50/30">
                      
                      {/* Month */}
                      <td className="py-4 px-4">
                        <div className="font-extrabold text-slate-800">{monthName}</div>
                        <div className="text-xs text-slate-400 font-mono mt-0.5">{run.month}</div>
                      </td>

                      {/* Shop details */}
                      <td className="py-4 px-4">
                        <div className="font-bold text-slate-700">{run.shop_name}</div>
                        <div className="text-xs text-slate-400 font-mono mt-0.5">GSTIN: {run.gst_number}</div>
                      </td>

                      {/* Target */}
                      <td className="py-4 px-4 text-right font-mono font-bold text-slate-600">
                        ₹{parseFloat(run.target_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Generated */}
                      <td className="py-4 px-4 text-right font-mono font-black text-vyapaar-emerald">
                        ₹{parseFloat(run.generated_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Bills Count */}
                      <td className="py-4 px-4 text-center font-extrabold text-vyapaar-blue">
                        {run.bills?.length || 0} invoices
                      </td>

                      {/* Export button */}
                      <td className="py-4 px-4 text-center">
                        <button 
                          onClick={() => handleDownloadPdf(run.id, run.month)}
                          disabled={downloadingId === run.id}
                          className="px-3.5 py-2 bg-blue-50 hover:bg-vyapaar-blue hover:text-white text-vyapaar-blue font-bold rounded-lg text-xs transition-all duration-300 flex items-center gap-1.5 mx-auto disabled:opacity-50"
                        >
                          {downloadingId === run.id ? (
                            <>
                              <Loader2 className="animate-spin" size={14} /> Building...
                            </>
                          ) : (
                            <>
                              <Download size={14} /> Download PDF
                            </>
                          )}
                        </button>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </UiCard>

    </div>
  );
};
