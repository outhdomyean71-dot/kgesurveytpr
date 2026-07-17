/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { FileCode, Clipboard, Check, HelpCircle, ArrowRight, ExternalLink } from 'lucide-react';

export default function AppsScriptView() {
  const [copied, setCopied] = useState(false);

  const appsScriptCode = `/**
 * Google Apps Script សម្រាប់បង្កើត Google Form ស្វ័យប្រវត្តិ 
 * និងបែងចែកទិន្នន័យស្ទង់មតិរវាងកម្រិត "មតេយ្យ" និង "បឋមសិក្សា" នៅក្នុង Google Sheet។
 * សាលារៀនសុវណ្ណភូមិ (Sovannaphumi School)
 */

function setupSurveyFormAndSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // ១. បង្កើតសន្លឹកកិច្ចការ (Sheets) សម្រាប់បែងចែកកម្រិតថ្នាក់
  let sheetKindergarten = ss.getSheetByName("មតេយ្យ");
  if (!sheetKindergarten) {
    sheetKindergarten = ss.insertSheet("មតេយ្យ");
    setupSheetHeaders(sheetKindergarten);
  }
  
  let sheetPrimary = ss.getSheetByName("បឋមសិក្សា");
  if (!sheetPrimary) {
    sheetPrimary = ss.insertSheet("បឋមសិក្សា");
    setupSheetHeaders(sheetPrimary);
  }

  // ២. បង្កើត Google Form ថ្មីមួយ
  const form = FormApp.create("កម្រងសំណួរស្ទង់មតិអាណាព្យាបាលសិស្ស - សាលារៀនសុវណ្ណភូមិ");
  form.setDescription("កម្រងសំណួរស្ទង់មតិពីអាណាព្យាបាលសិស្ស ទៅកាន់គ្រូបន្ទុកថ្នាក់ កម្រិតមតេយ្យ និងបឋមសិក្សា ដើម្បីស្វែងយល់ពីការពេញចិត្ត និងសំណូមពរផ្សេងៗ។\\n\\nកម្រិតពិន្ទុ៖ ១=មិនពេញចិត្ត 😞, ២=ពេញចិត្ត 😐, ៣=ពេញចិត្តណាស់ ☺");
  
  // ភ្ជាប់ Form ទៅកាន់ Spreadsheet នេះ
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());

  // ៣. បន្ថែមសំណួរព័ត៌មានទូទៅ
  form.addTextItem().setTitle("ឈ្មោះអាណាព្យាបាលសិស្ស (Parent's Name)").setRequired(true);
  form.addTextItem().setTitle("ឈ្មោះសិស្ស (Student's Name)").setRequired(true);
  
  const genderItem = form.addMultipleChoiceItem();
  genderItem.setTitle("ភេទសិស្ស (Gender)")
    .setChoiceValues(["ប្រុស", "ស្រី"])
    .setRequired(true);

  const levelItem = form.addMultipleChoiceItem();
  levelItem.setTitle("កម្រិតថ្នាក់ (Grade Level)")
    .setChoiceValues(["មតេយ្យ", "បឋមសិក្សា"])
    .setRequired(true);

  const classItem = form.addListItem();
  classItem.setTitle("ថ្នាក់សិក្សា (Class)")
    .setChoiceValues([
      "មតេយ្យកម្រិតទាប (Nursery)", 
      "មតេយ្យកម្រិតមធ្យម (Pre-Kindergarten)", 
      "មតេយ្យកម្រិតខ្ពស់ (Kindergarten)",
      "ថ្នាក់ទី១", "ថ្នាក់ទី២", "ថ្នាក់ទី៣", "ថ្នាក់ទី៤", "ថ្នាក់ទី៥", "ថ្នាក់ទី៦"
    ])
    .setRequired(true);

  form.addTextItem().setTitle("ឈ្មោះគ្រូបន្ទុកថ្នាក់ (Teacher's Name)").setRequired(true);

  // ៤. បន្ថែមសំណួរស្ទង់មតិទាំង ១០ (ប្រើ Scale 1-3)
  const questions = [
    "១. តើការបង្រៀនរបស់លោកគ្រូ-អ្នកគ្រូ មាតាបិតាសិស្ស/អាណាព្យាបាលពេញចិត្តដែរឬទេ?",
    "២. ចំពោះចំណេះដឹងរបស់បុត្រធីតា តើទទួលបានការអភិវឌ្ឍសមស្របដែរឬទេ?",
    "៣. ចំពោះកិច្ចការផ្ទះ ឬមេរៀន តើលោកគ្រូ-អ្នកគ្រូបានផ្តល់ជូនទៅសិស្សគ្រប់គ្នាដែរឬទេ?",
    "៤. តើអ្វីដែលលោកអ្នកពេញចិត្តខ្លាំងចំពោះគ្រូបន្ទុកថ្នាក់ ឬគ្រូបង្រៀន?",
    "៥. នៅក្នុងមួយឆ្នាំសិក្សានេះ តើបុត្រធីតារបស់អ្នកមានការរីកចម្រើនខ្លាំងដែរឬទេ? (ចំណេះដឹង ជំនាញ សីលធម៌ สุជីវធម៌)",
    "៦. តើការទំនាក់ទំនងរវាងគ្រូបន្ទុកថ្នាក់ ជាមួយអាណាព្យាបាលសិស្សមានភាពល្អប្រសើរដែរឬទេ?",
    "៧. តើគ្រូបន្ទុកថ្នាក់បានរាយការណ៍ ឬជម្រាបជូនអំពីលទ្ធផលសិក្សារបស់សិស្សច្បាស់លាស់ដែរឬទេ? (ចំណុចខ្លាំង/ខ្សោយ)",
    "៨. តើលោកគ្រូ-អ្នកគ្រូបានបង្ហោះរូបភាព និងសកម្មភាពសិក្សារបស់សិស្សក្នុងគ្រុបបានទៀងទាត់ដែរឬទេ?",
    "៩. តើមាតាបិតា/អាណាព្យាបាលពេញចិត្តនឹងឱ្យកូនៗចូលរួមធ្វើសកម្មភាពបំណិនជីវិតដែរឬទេ?",
    "១០. តើមាតាបិតាអាណាព្យាបាលសិស្សមានអ្វីសំណូមពរមកកាន់សាលារៀន ឬក៏គ្រូបន្ទុកថ្នាក់ដែរឬទេ?"
  ];

  for (let i = 0; i < questions.length; i++) {
    const scale = form.addScaleItem();
    scale.setTitle(questions[i])
         .setBounds(1, 3)
         .setLabels("មិនពេញចិត្ត 😞", "ពេញចិត្តណាស់ ☺")
         .setRequired(true);
  }

  // ៥. បន្ថែមសំណួរមតិយោបល់សរសេរផ្ទាល់ខ្លួន
  form.addParagraphTextItem()
      .setTitle("សូមបញ្ចេញមតិបន្ថែមអំពីគ្រូរបស់កូននៅទីនេះ (Additional Feedback)")
      .setRequired(false);

  Logger.log("Form created successfully!");
  Logger.log("Form URL: " + form.getEditUrl());
  
  // បង្ហាញសារជូនដំណឹងនៅក្នុង Sheet
  const ui = SpreadsheetApp.getUi();
  ui.alert("ជោគជ័យ!", "Google Form ត្រូវបានបង្កើតឡើង និងភ្ជាប់ទៅកាន់ Sheet នេះរួចរាល់។ URL កែសម្រួល៖ " + form.getEditUrl(), ui.ButtonSet.OK);
}

// កំណត់ក្បាលជួរឈរសម្រាប់ Sheet នីមួយៗ
function setupSheetHeaders(sheet) {
  const headers = [
    "កាលបរិច្ឆេទ", "ឈ្មោះអាណាព្យាបាល", "ឈ្មោះសិស្ស", "ភេទ", "កម្រិតថ្នាក់", "ថ្នាក់សិក្សា", "ឈ្មោះគ្រូបន្ទុកថ្នាក់",
    "សំណួរទី១", "សំណួរទី២", "សំណួរទី៣", "សំណួរទី៤", "សំណួរទី៥", "សំណួរទី៦", "សំណួរទី៧", "សំណួរទី៨", "សំណួរទី៩", "សំណួរទី១០",
    "មតិយោបល់បន្ថែម", "កំណត់សម្គាល់របស់គ្រូ (Teacher's Notes)", "ការវិភាគដោយ AI (AI Analysis)"
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#0f2a4a").setFontColor("#ffffff");
  sheet.setFrozenRows(1);
}

/**
 * Web App API Endpoint: ទទួលទិន្នន័យពីកម្មវិធី React និងបញ្ចូលទៅក្នុង Google Sheet ដោយស្វ័យប្រវត្តិតាមកម្រិតថ្នាក់។
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // បែងចែក Sheet តាមកម្រិតថ្នាក់
    const sheetName = data.gradeLevel === "មតេយ្យ" ? "មតេយ្យ" : "បឋមសិក្សា";
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      setupSheetHeaders(sheet);
    }
    
    // បំប្លែង ratings ទៅជា array តាមលំដាប់លំដោយសំណួរ ១ ដល់ ១០
    const rowData = [
      data.date || new Date().toISOString().split('T')[0],
      data.parentName,
      data.studentName,
      data.studentGender,
      data.gradeLevel,
      data.subGrade,
      data.teacherName,
      data.ratings[1],
      data.ratings[2],
      data.ratings[3],
      data.ratings[4],
      data.ratings[5],
      data.ratings[6],
      data.ratings[7],
      data.ratings[8],
      data.ratings[9],
      data.ratings[10],
      data.additionalComments || "",
      data.teacherNotes || "",
      data.aiRecommendation || ""
    ];
    
    sheet.appendRow(rowData);
    
    return ContentService.createTextOutput(JSON.stringify({ "status": "success", "message": "បញ្ចូលទិន្នន័យជោគជ័យទៅកាន់សន្លឹកកិច្ចការ៖ " + sheetName }))
                         .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ "status": "error", "message": error.toString() }))
                         .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * ស្វ័យប្រវត្តិកម្មផ្ញើទិន្នន័យត្រឡប់មកកាន់ Web App របស់សាលាវិញភ្លាមៗ (Real-time Sync Webhook)
 * រាល់ពេលដែលអាណាព្យាបាលបំពេញសំណួរលើ Google Form កូដនេះនឹងរុញទិន្នន័យចូលមកក្នុង Web App នេះដោយស្វ័យប្រវត្តិ។
 * 
 * របៀបតម្លើង Trigger:
 * ១. នៅក្នុងផ្ទាំង Apps Script ជ្រើសរើស "Triggers" (រូបនាឡិកា នៅខាងឆ្វេងដៃ)
 * ២. ចុចប៊ូតុង "Add Trigger" (នៅជ្រុងខាងស្តាំខាងក្រោម)
 * ៣. កំណត់៖
 *    - Choose which function to run: "onFormSubmitTrigger"
 *    - Choose which deployment should run: "Head"
 *    - Select event source: "From spreadsheet"
 *    - Select event type: "On form submit"
 * ៤. ចុច Save រួចអនុញ្ញាតសិទ្ធិ (Authorize) ជាការស្រេច!
 */
function onFormSubmitTrigger(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const row = sheet.getLastRow();
    const values = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    // លីង Web App របស់សាលា (ចម្លង និងជំនួសដោយស្វ័យប្រវត្តិ)
    const webAppUrl = "${typeof window !== 'undefined' ? window.location.origin : 'https://your-app-url.com'}/api/responses";
    
    const ratings = {};
    for (var i = 1; i <= 10; i++) {
      ratings[i] = parseInt(values[6 + i]) || 3; // សំណួរ ១ ដល់ ១០ ចាប់ផ្តើមពីជួរឈរទី ៧
    }
    
    const payload = {
      id: "gs_" + new Date().getTime() + "_" + Math.floor(Math.random() * 1000),
      date: values[0] ? new Date(values[0]).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      parentName: values[1] || "",
      studentName: values[2] || "",
      studentGender: values[3] || "ប្រុស",
      gradeLevel: values[4] || "បឋមសិក្សា",
      subGrade: values[5] || "ថ្នាក់ទី១",
      teacherName: values[6] || "",
      ratings: ratings,
      additionalComments: values[17] || "",
      teacherNotes: values[18] || "",
      aiRecommendation: values[19] || "",
      createdAt: new Date().toISOString()
    };
    
    const options = {
      "method": "post",
      "contentType": "application/json",
      "payload": JSON.stringify(payload),
      "muteHttpExceptions": true
    };
    
    UrlFetchApp.fetch(webAppUrl, options);
    Logger.log("ផ្ញើទិន្នន័យជោគជ័យទៅកាន់ Web App!");
  } catch (err) {
    Logger.log("កំហុសក្នុងការផ្ញើទិន្នន័យ៖ " + err.toString());
  }
}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(appsScriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8" id="apps-script-view">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-100">
          <div>
            <span className="px-3 py-1 text-xs font-semibold text-blue-700 bg-blue-50 rounded-full">Google Suite Integration</span>
            <h2 className="text-2xl font-bold text-slate-800 mt-2 font-sans flex items-center gap-2">
              <FileCode className="h-6 w-6 text-blue-600" />
              កូដ Google Apps Script ស្វ័យប្រវត្តិកម្ម
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              ប្រើប្រាស់កូដខាងក្រោមនេះដើម្បីបង្កើត Google Form និងរៀបចំតារាង Google Sheet បែងចែកទិន្នន័យស្វ័យប្រវត្តិតាមកម្រិតថ្នាក់។
            </p>
          </div>
          <button
            onClick={copyToClipboard}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#0f2a4a] text-amber-400 hover:bg-slate-800 text-sm font-medium rounded-xl shadow-sm transition-all duration-200 active:scale-95 cursor-pointer shrink-0 border border-amber-400/20"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-green-400" />
                ចម្លងរួចរាល់!
              </>
            ) : (
              <>
                <Clipboard className="h-4 w-4" />
                ចម្លងកូដ Apps Script
              </>
            )}
          </button>
        </div>

        {/* Instructions Block */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 h-24 w-24 bg-blue-500/5 rounded-full -mr-6 -mt-6 transition-all duration-300 group-hover:scale-125" />
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-blue-100 text-blue-600 text-sm font-bold">១</div>
              <h3 className="font-bold text-slate-800 text-base">រៀបចំសន្លឹកកិច្ចការ</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              បង្កើត Google Sheet ថ្មីមួយ រួចចុចលើម៉ឺនុយ <strong className="text-slate-800">Extensions (ផ្នែកបន្ថែម)</strong> &gt; <strong className="text-slate-800">Apps Script</strong>។
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 h-24 w-24 bg-amber-500/5 rounded-full -mr-6 -mt-6 transition-all duration-300 group-hover:scale-125" />
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-amber-100 text-amber-700 text-sm font-bold">២</div>
              <h3 className="font-bold text-slate-800 text-base">បិទភ្ជាប់ និងដំណើរការ</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              លុបកូដចាស់ៗចោល រួចបិទភ្ជាប់ (Paste) កូដដែលបានចម្លងនេះ។ ចុច <strong className="text-slate-800">Save (រក្សាទុក)</strong> និងចុច <strong className="text-slate-800">Run</strong> ដើម្បីបង្កើត Form ស្វ័យប្រវត្តិ។
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 h-24 w-24 bg-emerald-500/5 rounded-full -mr-6 -mt-6 transition-all duration-300 group-hover:scale-125" />
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-emerald-100 text-emerald-700 text-sm font-bold">៣</div>
              <h3 className="font-bold text-slate-800 text-base">ដាក់ឱ្យដំណើរការ Web App</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              ចុច <strong className="text-slate-800">Deploy &gt; New deployment</strong> ជ្រើសរើសប្រភេទ <strong className="text-slate-800">Web App</strong> (កំណត់ Who has access: Anyone) ដើម្បីយក URL មកភ្ជាប់ក្នុងកម្មវិធីនេះ។
            </p>
          </div>
        </div>

        {/* Code Editor Preview */}
        <div className="rounded-xl border border-slate-200 overflow-hidden shadow-inner bg-slate-900 text-slate-300 font-mono text-xs relative max-h-[480px] overflow-y-auto">
          <div className="bg-slate-950 px-4 py-2 border-b border-slate-800 flex items-center justify-between sticky top-0 z-10">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500" />
              <span className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-slate-400 text-[10px] ml-2">code.gs — Google Apps Script</span>
            </div>
            <span className="text-[10px] text-slate-500 uppercase">Javascript / GAS</span>
          </div>
          <pre className="p-4 leading-relaxed overflow-x-auto text-left">
            <code>{appsScriptCode}</code>
          </pre>
        </div>
      </div>

      {/* Sheet Deployment Guide */}
      <div className="bg-[#0f2a4a] rounded-2xl border border-slate-800 text-white p-6 md:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 h-64 w-64 bg-amber-500/5 rounded-full -mr-20 -mt-20 blur-xl" />
        <div className="max-w-3xl">
          <h3 className="text-lg md:text-xl font-bold text-amber-400 mb-3 font-sans">
            ហេតុអ្វីត្រូវប្រើប្រាស់ Google Apps Script នេះ?
          </h3>
          <ul className="space-y-4 text-sm text-slate-200 list-none pl-0">
            <li className="flex items-start gap-2.5">
              <div className="h-5 w-5 rounded-full bg-amber-400/20 text-amber-300 flex items-center justify-center shrink-0 text-xs mt-0.5">✓</div>
              <div>
                <strong className="text-amber-300">បែងចែកទិន្នន័យស្វ័យប្រវត្តិ៖</strong> រាល់ពេលមានអាណាព្យាបាលឆ្លើយតប ទិន្នន័យនឹងត្រូវបញ្ជូនទៅសន្លឹកកិច្ចការ <strong className="text-white">"មតេយ្យ"</strong> ឬ <strong className="text-white">"បឋមសិក្សា"</strong> ដាច់ដោយឡែកពីគ្នា ស្របទៅតាមការ Submit ជាក់ស្តែង។
              </div>
            </li>
            <li className="flex items-start gap-2.5">
              <div className="h-5 w-5 rounded-full bg-amber-400/20 text-amber-300 flex items-center justify-center shrink-0 text-xs mt-0.5">✓</div>
              <div>
                <strong className="text-amber-300">រៀបចំរចនាសម្ព័ន្ធស្អាត៖</strong> រៀបចំក្បាលជួរឈរ (Headers) ច្បាស់លាស់ ងាយស្រួលគ្រប់គ្រងតាមថ្នាក់នីមួយៗ និងមានបន្ថែមជួរឈរសម្រាប់សរសេរកំណត់សម្គាល់សិស្ស ឬបញ្ចូលអនុសាសន៍ឆ្លាតវៃពី AI។
              </div>
            </li>
            <li className="flex items-start gap-2.5">
              <div className="h-5 w-5 rounded-full bg-amber-400/20 text-amber-300 flex items-center justify-center shrink-0 text-xs mt-0.5">✓</div>
              <div>
                <strong className="text-amber-300">សមកាលកម្មទិន្នន័យ (Sync)៖</strong> អ្នកអាចវាយតម្លៃតាមរយៈទម្រង់អនឡាញក្នុងកម្មវិធីនេះ ហើយចុច Submit ទៅកាន់ Google Sheet ដោយផ្ទាល់ (បន្ទាប់ពីបំពេញ Web App URL នៅក្នុងផ្ទាំងបញ្ជា)។
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
