/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { FileCode, Clipboard, Check, HelpCircle, ArrowRight, ExternalLink } from 'lucide-react';

export default function AppsScriptView() {
  const [copied, setCopied] = useState(false);

  const appsScriptCode = `/**
 * Google Apps Script សម្រាប់បញ្ជូនទិន្នន័យពិន្ទុប្រឡងមុខវិជ្ជាកុំព្យូទ័រទៅកាន់ Google Sheet។
 * សាលារៀនសុវណ្ណភូមិ (Sovannaphumi School)
 */

function setupExamSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  let sheet = ss.getSheetByName("លទ្ធផលប្រឡង");
  if (!sheet) {
    sheet = ss.insertSheet("លទ្ធផលប្រឡង");
    setupSheetHeaders(sheet);
  }
}

// កំណត់ក្បាលជួរឈរសម្រាប់ Sheet
function setupSheetHeaders(sheet) {
  const headers = [
    "កាលបរិច្ឆេទ", "ឈ្មោះសិស្ស", "ភេទ", "កម្រិតថ្នាក់", "ពិន្ទុ", "ពិន្ទុសរុប", "មតិយោបល់គ្រូ", "មតិយោបល់ AI"
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#0f2a4a").setFontColor("#ffffff");
  sheet.setFrozenRows(1);
}

/**
 * Web App API Endpoint: ទទួលទិន្នន័យពីកម្មវិធី React និងបញ្ចូលទៅក្នុង Google Sheet ដោយស្វ័យប្រវត្តិ។
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    let sheet = ss.getSheetByName("លទ្ធផលប្រឡង");
    if (!sheet) {
      sheet = ss.insertSheet("លទ្ធផលប្រឡង");
      setupSheetHeaders(sheet);
    }
    
    const rowData = [
      data.date || new Date().toISOString().split('T')[0],
      data.studentName || "",
      data.studentGender || "",
      data.gradeLevel || "",
      data.score || 0,
      data.totalScore || 0,
      data.teacherNotes || "",
      data.aiRecommendation || ""
    ];
    
    sheet.appendRow(rowData);
    
    return ContentService.createTextOutput(JSON.stringify({ "status": "success", "message": "បញ្ចូលទិន្នន័យជោគជ័យ" }))
                         .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ "status": "error", "message": error.toString() }))
                         .setMimeType(ContentService.MimeType.JSON);
  }
}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(appsScriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-amber-400 to-amber-500 rounded-2xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <h2 className="text-2xl font-bold mb-2 relative z-10 flex items-center gap-2">
          <FileCode className="h-6 w-6" /> ការភ្ជាប់ទិន្នន័យជាមួយ Google Sheet
        </h2>
        <p className="text-amber-50 relative z-10 max-w-2xl text-sm leading-relaxed">
          សម្រាប់អ្នកគ្រប់គ្រងសាលារៀន ដែលចង់ឱ្យទិន្នន័យប្រឡងរបស់សិស្ស រត់ចូលទៅកាន់ Google Sheet ផ្ទាល់ខ្លួនរបស់សាលាដោយស្វ័យប្រវត្តិ ដើម្បីងាយស្រួលធ្វើរបាយការណ៍បន្ត។
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm relative overflow-hidden">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-6">
              <HelpCircle className="h-5 w-5 text-blue-500" /> របៀបរៀបចំ (How to setup)
            </h3>
            
            <div className="space-y-5 relative before:absolute before:inset-0 before:ml-4 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent hidden"></div>
            
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="h-8 w-8 rounded-full bg-blue-50 text-blue-600 font-bold flex items-center justify-center shrink-0 border-2 border-white shadow-sm z-10">១</div>
                <div>
                  <h4 className="font-bold text-sm text-slate-800">បង្កើត Google Sheet ថ្មី</h4>
                  <p className="text-xs text-slate-500 mt-1">ចូលទៅកាន់ Google Drive របស់អ្នក ហើយបង្កើត Spreadsheet ថ្មីមួយ។</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="h-8 w-8 rounded-full bg-blue-50 text-blue-600 font-bold flex items-center justify-center shrink-0 border-2 border-white shadow-sm z-10">២</div>
                <div>
                  <h4 className="font-bold text-sm text-slate-800">បើកផ្ទាំង Apps Script</h4>
                  <p className="text-xs text-slate-500 mt-1">នៅក្នុង Sheet សូមចុចលើមឺនុយ <strong>Extensions &gt; Apps Script</strong>។</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="h-8 w-8 rounded-full bg-amber-50 text-amber-600 font-bold flex items-center justify-center shrink-0 border-2 border-white shadow-sm z-10">៣</div>
                <div>
                  <h4 className="font-bold text-sm text-slate-800">ចម្លងកូដបញ្ចូល</h4>
                  <p className="text-xs text-slate-500 mt-1">លុបកូដចាស់ចោល រួចចម្លងកូដពីផ្ទាំងខាងស្តាំនេះទៅដាក់ជំនួសវិញ។</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="h-8 w-8 rounded-full bg-blue-50 text-blue-600 font-bold flex items-center justify-center shrink-0 border-2 border-white shadow-sm z-10">៤</div>
                <div>
                  <h4 className="font-bold text-sm text-slate-800">រត់កូដ Setup</h4>
                  <p className="text-xs text-slate-500 mt-1">ជ្រើសរើស function <code>setupExamSheet</code> រួចចុច Run ឱ្យវាបង្កើត Sheet ស្វ័យប្រវត្តិ។</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="h-8 w-8 rounded-full bg-emerald-50 text-emerald-600 font-bold flex items-center justify-center shrink-0 border-2 border-white shadow-sm z-10">៥</div>
                <div>
                  <h4 className="font-bold text-sm text-slate-800">Deploy & យក URL</h4>
                  <p className="text-xs text-slate-500 mt-1">ចុចប៊ូតុង <strong>Deploy &gt; New deployment</strong>។ ជ្រើសរើស <strong>Web app</strong> កំណត់សិទ្ធិឱ្យ <strong>Anyone</strong>។ រួច Copy URL យកមកដាក់ក្នុង Setting នៃកម្មវិធីនេះ។</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-[#0f172a] rounded-2xl shadow-xl overflow-hidden flex flex-col h-full border border-slate-700">
            <div className="px-4 py-3 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                </div>
                <span className="ml-2 text-xs font-mono text-slate-400">Code.gs</span>
              </div>
              <button
                onClick={copyToClipboard}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer \${
                  copied ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white'
                }`}
              >
                {copied ? <><Check className="h-3.5 w-3.5" /> បានចម្លង</> : <><Clipboard className="h-3.5 w-3.5" /> ចម្លងកូដ</>}
              </button>
            </div>
            <div className="p-4 overflow-x-auto overflow-y-auto max-h-[600px] flex-1 custom-scrollbar">
              <pre className="text-[13px] leading-relaxed font-mono text-slate-300">
                <code className="language-javascript">{appsScriptCode}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
