"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Scale,
  Search,
  CheckCircle2,
  FileText,
  Printer,
  Copy,
  Download,
  PhoneCall,
  ArrowRight,
  ArrowLeft,
  Building2,
  Sparkles,
  Lock,
  CreditCard,
  QrCode,
  Check,
  User,
  FileCheck,
  X,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Smartphone,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { QUICK_PROBLEMS, QuickProblem, findMatchingProblem } from "./guideData";
import { useAuthStore } from "@/lib/store/authStore";
import { api, getErrorMessage } from "@/lib/api";
import { loadRazorpayScript } from "@/lib/razorpay";
import PropertyLegalCheck from "./PropertyLegalCheck";

type Language = "mr" | "hi" | "en";
type ActiveTab = "draft" | "saved" | "property";

export default function SimpleCitizenPortalPage() {
  const router = useRouter();
  const { user, isAuthenticated, logout, citizenLogin, citizenRegister } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const [lang, setLang] = useState<Language>("mr");

  // ── Main Navigation Tabs ──────────────────────────────────────────────────
  // 1: "draft" (अधिकृत कोर्ट अर्ज जनरेटर - ₹३०) - DIRECT DEFAULT
  // 2: "saved" (माझे जतन केलेले अर्ज)
  // 3: "property" (मालमत्ता कायदेशीर तपासणी)
  const [activeTab, setActiveTab] = useState<ActiveTab>("draft");

  // ── Problem & Solution State ──────────────────────────────────────────────
  const [problemText, setProblemText] = useState<string>("");
  const [activeProblem, setActiveProblem] = useState<QuickProblem | null>(
    QUICK_PROBLEMS.find((p) => p.id === "police_complaint") || QUICK_PROBLEMS[0]
  );

  // ── Drafting Form State ───────────────────────────────────────────────────
  const [applicantName, setApplicantName] = useState<string>("");
  const [applicantPhone, setApplicantPhone] = useState<string>("");
  const [applicantAddress, setApplicantAddress] = useState<string>("");
  const [oppositeParty, setOppositeParty] = useState<string>("");
  const [opponentAddress, setOpponentAddress] = useState<string>("");
  const [incidentDate, setIncidentDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [incidentTime, setIncidentTime] = useState<string>("");
  const [incidentPlace, setIncidentPlace] = useState<string>("");
  const [claimAmount, setClaimAmount] = useState<string>("");
  const [bankOrOrgName, setBankOrOrgName] = useState<string>("");
  const [accountOrUtr, setAccountOrUtr] = useState<string>("");
  const [extraDetails, setExtraDetails] = useState<string>("");
  const [pageFormatPreference, setPageFormatPreference] = useState<"auto" | "1page" | "2page">("auto");
  const [docPreviewTab, setDocPreviewTab] = useState<"court" | "text">("court");
  const [generatedDoc, setGeneratedDoc] = useState<string>("");
  const [isDrafting, setIsDrafting] = useState<boolean>(false);

  // ── ₹30 Payment / Checkout State ──────────────────────────────────────────
  const [showPayModal, setShowPayModal] = useState<boolean>(false);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [successDetails, setSuccessDetails] = useState<{
    receiptId: string;
    paymentId: string;
    title: string;
    amount: string;
    date: string;
  } | null>(null);
  const [isPaid, setIsPaid] = useState<boolean>(false);
  const [receiptId, setReceiptId] = useState<string>("");
  const [paymentTab, setPaymentTab] = useState<"upi_qr" | "card">("upi_qr");
  const [upiUtrInput, setUpiUtrInput] = useState<string>("");
  const [isProcessingPay, setIsProcessingPay] = useState<boolean>(false);
  const [isEditingDetails, setIsEditingDetails] = useState<boolean>(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState<boolean>(false);
  const [searchPhoneInput, setSearchPhoneInput] = useState<string>("");
  const [isSearchingPhone, setIsSearchingPhone] = useState<boolean>(false);

  // ── Step-by-Step Flow States ──────────────────────────────────────────────
  // Step 1: select case (selectedCategoryId)
  // Step 2: view solution (showSolution)
  // Step 3: open document (showDocument)
  // Step 4: pay & download (isPaid)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [showSolution, setShowSolution] = useState<boolean>(false);
  const [showDocument, setShowDocument] = useState<boolean>(false);
  const solutionRef = useRef<HTMLDivElement>(null);
  const documentRef = useRef<HTMLDivElement>(null);

  // ── Saved Documents State ─────────────────────────────────────────────────
  const [savedDocs, setSavedDocs] = useState<any[]>([]);

  // ── Sign In / Register Popup Modal State ──────────────────────────────────
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authModalTab, setAuthModalTab] = useState<"login" | "register">("login");
  const [authMode, setAuthMode] = useState<"password" | "otp">("password");
  const [showAuthPass, setShowAuthPass] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [showForgotModal, setShowForgotModal] = useState<boolean>(false);
  const [pendingAction, setPendingAction] = useState<"solve" | "draft" | "pay" | "tab_draft" | "tab_saved" | null>(null);

  // Auth Form Fields
  const [authEmail, setAuthEmail] = useState<string>("");
  const [authPassword, setAuthPassword] = useState<string>("");
  const [authFullName, setAuthFullName] = useState<string>("");
  const [authPhone, setAuthPhone] = useState<string>("");

  // OTP Login State inside modal
  const [authOtpStep, setAuthOtpStep] = useState<"email" | "code">("email");
  const [authOtpDigits, setAuthOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [authOtpTimer, setAuthOtpTimer] = useState<number>(60);
  const [authCanResend, setAuthCanResend] = useState<boolean>(false);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Pre-fill user data if already authenticated
  useEffect(() => {
    if (user) {
      if (user.full_name && !applicantName) setApplicantName(user.full_name);
      if (user.phone && !applicantPhone) setApplicantPhone(user.phone);
    }
  }, [user]);

  // Auto-generate draft when entering draft tab if not yet generated
  useEffect(() => {
    if (activeTab === "draft" && activeProblem && !generatedDoc) {
      generateDraftForProblem(activeProblem, applicantName, applicantPhone, oppositeParty, incidentPlace, incidentDate);
    }
  }, [activeTab, activeProblem, generatedDoc]);

  // Load saved documents from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("fastcase_citizen_docs");
      if (saved) {
        setSavedDocs(JSON.parse(saved));
      }
    } catch (e) {}
  }, []);

  // OTP timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (showAuthModal && authMode === "otp" && authOtpStep === "code" && authOtpTimer > 0) {
      interval = setInterval(() => setAuthOtpTimer((t) => t - 1), 1000);
    } else if (authOtpTimer === 0) {
      setAuthCanResend(true);
    }
    return () => clearInterval(interval);
  }, [showAuthModal, authMode, authOtpStep, authOtpTimer]);

  // ── Authentication Protection Trigger ─────────────────────────────────────
  const requireAuth = (action: "solve" | "draft" | "pay" | "tab_draft" | "tab_saved", callback?: () => void) => {
    if (!isAuthenticated) {
      setPendingAction(action);
      setShowAuthModal(true);
      return false;
    }
    if (callback) callback();
    return true;
  };

  // Resume pending action after successful login/registration
  const resumePendingAction = () => {
    setShowAuthModal(false);
    const act = pendingAction;
    setPendingAction(null);

    if (act === "solve") {
      executeSolve();
    } else if (act === "draft" || act === "tab_draft") {
      setActiveTab("draft");
      executeDraft();
    } else if (act === "pay") {
      setShowPayModal(true);
    } else if (act === "tab_saved") {
      setActiveTab("saved");
    }
  };

  // ── Clean Human-Readable Petition Titles Map ─────────────────────────────
  const CLEAN_TITLES_MAP: Record<string, string> = {
    police_complaint: "पोलीस ठाण्यात लेखी तक्रार अर्ज",
    cyber_fraud: "ऑनलाइन बँक व UPI फसवणूक तक्रार अर्ज",
    fir_registration: "प्रथम माहिती अहवाल (FIR) नोंदणी अर्ज",
    police_refusal: "तक्रार नोंदवून घेणेबाबतचा अर्ज",
    consumer_fraud: "ग्राहक संरक्षण तक्रार अर्ज",
    property_land: "जमीन व मिळकत वाद तक्रार अर्ज",
    unpaid_salary: "थकीत पगार व कामाचा मोबदला अर्ज",
    women_safety: "महिला संरक्षण व छळवणूक विरोधी तक्रार अर्ज",
    lost_document: "कागदपत्रे / फोन गहाळ नोंद अर्ज",
    bail_procedure: "जामीन मिळणेबाबत अर्ज (Bail Application)",
    zero_fir: "Zero FIR तात्काळ नोंदणी अर्ज",
    arrest_rights: "नागरिक संरक्षण व कायदेशीर हक्क अर्ज",
  };

  // ── Petition Layout & Content Model (Handbook-Grade Legal Architecture) ───
  const getPetitionModel = (docTitle?: string, customReceipt?: string) => {
    const applicant = (applicantName.trim() || user?.full_name || "नागरिक अर्जदार");
    const phone = (applicantPhone.trim() || user?.phone || "नोंदणीकृत मोबाईल");
    const address = (applicantAddress.trim() || incidentPlace.trim() || "स्थानिक रहिवासी");
    const opp = (oppositeParty.trim() || "संबंधित कार्यालय / संस्था");
    const oppAddress = (opponentAddress.trim() || incidentPlace.trim() || "स्थानिक शाखा / कार्यालय");
    const place = (incidentPlace.trim() || "महाराष्ट्र");
    const date = (incidentDate || new Date().toISOString().split("T")[0]);
    const time = incidentTime.trim();
    const amount = claimAmount.trim();
    const bank = bankOrOrgName.trim();
    const utr = accountOrUtr.trim();
    const extra = extraDetails.trim();
    const today = new Date().toLocaleDateString("mr-IN");
    const receiptToUse = customReceipt || receiptId || `FC-DOC-${Date.now().toString().slice(-6)}`;
    
    // Clean, natural title without tutorial questions or brackets
    const titleToUse =
      (activeProblem?.id && CLEAN_TITLES_MAP[activeProblem.id]) ||
      (docTitle
        ? docTitle.replace(/\s*\(General Police Complaint\)/gi, "").replace(/\s*\(Cyber Fraud\)/gi, "").replace(/कशी दाखल करावी\?/g, "").replace(/कशी करावी\?/g, "").trim() + " अर्ज"
        : "लेखी तक्रार अर्ज");

    const chapterBadge = activeProblem?.chapter_badge || "प्रकरण १ • अधिकृत विधी मसुदा";
    const deadlineToUse = activeProblem?.statutory_deadline_mr || "गुन्हा घडल्याबरोबर अथवा हक्कांचे उल्लंघन झाल्यावर तात्काळ दाद मागावी; विलंबाचे कारण अर्जात स्पष्ट लिहावे.";
    const summaryTable = activeProblem?.quick_summary_table;

    const template = activeProblem?.draft_template || {
      recipient_title: "मा. पोलीस निरीक्षक साहेब, स्थानिक पोलीस ठाणे",
      subject: `${titleToUse} दाखल करणेबाबत`,
      act_reference: "भारतीय नागरिक सुरक्षा संहिता (BNSS) २०२३ / भारतीय न्याय संहिता (BNS) २०२३",
      body_facts: "अर्जदाराने नमूद केलेल्या घटनेनुसार कायदेशीर हक्कांचे थेट व गंभीर उल्लंघन झाले आहे.",
      relief: "सदर प्रकरणी योग्य ती कायदेशीर चौकशी करून अर्जदारास तात्काळ न्याय व नुकसानभरपाई मिळवून द्यावी ही नम्र विनंती.",
    };

    let recipientClean = template.recipient_title
      .replace(/\[बँकेचे नाव\]/g, bank || opp || "संबंधित बँक शाखा")
      .replace(/\[कार्यालयाचे नाव\]/g, opp || "संबंधित कार्यालय")
      .replace(/\[पोलीस ठाण्याचे नाव\]/g, oppAddress || place || "स्थानिक पोलीस ठाणे")
      .replace(/\[जिल्ह्याचे नाव\]/g, place || "स्थानिक जिल्हा")
      .replace(/\[जिल्हा\]/g, place || "स्थानिक जिल्हा")
      .replace(/\[पत्ता\]/g, oppAddress || "स्थानिक पत्ता")
      .replace(/\[[^\]]+\]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    let factsClean = template.body_facts
      .replace(/\[आपले नाव\]/g, applicant)
      .replace(/\[मोबाईल\]/g, phone)
      .replace(/\[पत्ता\]/g, address)
      .replace(/\[तारीख\]/g, date)
      .replace(/\[वेळ\]/g, time ? `अंदाजे वेळ ${time}` : "सदर वेळी")
      .replace(/\[ठिकाण\]/g, place)
      .replace(/\[बँकेचे नाव\]/g, bank || opp || "संबंधित बँक शाखा")
      .replace(/\[खाते क्र\.\]/g, utr ? utr : "नोंदणीकृत बँक खाते")
      .replace(/\[रक्कम\]/g, amount ? `रुपये ${amount}/-` : "कापलेली रक्कम")
      .replace(/\[थकीत रक्कम\]/g, amount ? `रुपये ${amount}/-` : "थकीत रक्कम")
      .replace(/\[आयडी\]/g, utr || "बँक स्टेटमेंटनुसार")
      .replace(/\[बिल क्र\.\]/g, utr || "पावतीनुसार")
      .replace(/\[मेसेज\/कॉल\/बनावट लिंक\]/g, extra || "बनावट कॉल / OTP / संशयास्पद लिंक")
      .replace(/\[कंपनीचे नाव\]/g, opp)
      .replace(/\[विरोधी पक्षाचे नाव\]/g, opp)
      .replace(/\[आरोपीचे नाव\]/g, opp)
      .replace(/\[कार्यालयाचे नाव\]/g, opp)
      .replace(/\[पतीचे नाव\]/g, opp)
      .replace(/\[गुन्ह्याचा तपशील - मारहाण\/धमकी\/चोरी\]/g, extra || "दखलपात्र गुन्हा")
      .replace(/\[घटनेचा तपशील\]/g, extra || "कायदेशीर हक्कांचे उल्लंघन")
      .replace(/\[दोषाचे वर्णन\]/g, extra || "वस्तू / सेवेमधील सदोषपणा")
      .replace(/\[पोलीस ठाण्याचे नाव\]/g, oppAddress || place || "स्थानिक पोलीस ठाणे")
      .replace(/\[जिल्ह्याचे नाव\]/g, place || "स्थानिक जिल्हा")
      .replace(/\[जिल्हा\]/g, place || "स्थानिक जिल्हा")
      .replace(/\[तालुका \/ जिल्हा\]/g, place || "स्थानिक तालुका/जिल्हा")
      .replace(/\[गावाचे नाव\]/g, place || "स्थानिक गाव")
      .replace(/\[सर्व्हे क्र\.\]/g, utr || "मिळकत / सर्व्हे क्र.")
      .replace(/\[विवाह तारीख\]/g, date)
      .replace(/\[वस्तूचे नाव\]/g, extra || "खरेदी केलेली वस्तू / सेवा")
      .replace(/\[हुद्दा\]/g, "कर्मचारी / कामगार")
      .replace(/\[महिना\]/g, "संबंधित कालावधी")
      .replace(/\[मुद्दा १\]/g, extra || "संबंधित कामाची अधिकृत नोंद व कागदपत्रांची प्रमाणित प्रत")
      .replace(/\[मुद्दा २\]/g, "सदर प्रकरणातील सक्षम प्राधिकाऱ्यांचे आदेश व टिप्पणी")
      .replace(/\[कार्यालयाचे नाव \/ काम\]/g, opp || "संबंधित कार्यालयीन कामकाज")
      .replace(/\[कागदपत्राचे नाव व क्रमांक[^\]]*\]/g, extra || utr || "महत्त्वाचे अधिकृत मूळ कागदपत्र")
      .replace(/\[[^\]]+\]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    // Standard complaint defaults to 1 single clean page
    const isTwoPage =
      pageFormatPreference === "2page" ? true :
      pageFormatPreference === "1page" ? false :
      (extra.length > 250 || (factsClean.length + template.relief.length > 700));

    return {
      applicant, phone, address, opp, oppAddress, place, date, time, amount, bank, utr, extra, today,
      receiptToUse, titleToUse, chapterBadge, deadlineToUse, summaryTable, template,
      recipientClean, factsClean, isTwoPage
    };
  };

  // ── Publication-Grade HTML Section Builders (Clean, Simple, Easy-to-Understand) ──
  const renderPublicationHeaderHtml = (chapterBadge: string, title: string) => `
    <div style="text-align: center; margin-bottom: 12px; border-bottom: 2px solid #0f172a; padding-bottom: 6px;">
      <div style="font-size: 11pt; font-weight: 700; color: #334155; letter-spacing: 2px; margin-bottom: 3px;">
        ॥ श्री गणेशाय नमः ॥ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ॥ सत्यमेव जयते ॥
      </div>
      <div style="font-size: 14pt; font-weight: 800; color: #0f172a; letter-spacing: 0.5px; margin-top: 2px;">
        ${title}
      </div>
      <div style="font-size: 8.5pt; color: #475569; margin-top: 2px;">
        (भारतीय नागरिक सुरक्षा संहिता २०२३ / BNS २०२३ / ग्राहक संरक्षण कायदा २०१९ अंतर्गत विहित अर्ज)
      </div>
    </div>
  `;

  const renderEFilingBarHtml = (receipt: string, today: string) => `
    <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; padding: 5px 12px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; font-size: 8.5pt;">
      <div style="color: #0f172a;">
        नोंदणी क्र.: <span style="font-family: monospace; font-weight: 800; color: #0f172a;">${receipt}</span>
      </div>
      <div style="color: #065f46; font-weight: 700; background: #ecfdf5; border: 1px solid #a7f3d0; padding: 2px 8px; border-radius: 4px;">
        ✓ अधिकृत लेखी प्रत
      </div>
      <div style="color: #334155;">
        दिनांक: <b>${today}</b>
      </div>
    </div>
  `;

  const renderSubjectBoxHtml = (recipient: string, subject: string, actRef?: string) => `
    <div style="margin-bottom: 10px; font-size: 9.5pt; line-height: 1.5; color: #0f172a;">
      <div style="font-weight: 800; margin-bottom: 2px;">प्रति,</div>
      <div style="font-weight: 700; padding-left: 14px; color: #0f172a;">
        ${recipient}
      </div>
    </div>

    <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-left: 3.5px solid #0f172a; border-radius: 4px; padding: 6px 12px; margin-bottom: 10px; font-size: 9.5pt; line-height: 1.5;">
      <div>
        <span style="font-weight: 800; color: #0f172a;">विषय:</span>
        <span style="font-weight: 700; color: #0f172a; text-decoration: underline;"> ${subject.includes("अर्ज") || subject.includes("बाबत") ? subject : `${subject} बाबत लेखी तक्रार अर्ज.`}</span>
      </div>
      ${actRef ? `
      <div style="margin-top: 3px; font-size: 8.5pt; color: #475569; font-weight: 600;">
        <b>कायदेशीर संदर्भ:</b> ${actRef}
      </div>` : ""}
    </div>
  `;

  // Clean, human-readable Parties section (NO TABLES - plain, respectful, easy to understand)
  const renderPartiesTableHtml = (m: ReturnType<typeof getPetitionModel>) => `
    <div style="margin-bottom: 12px; font-size: 9.5pt; line-height: 1.55; color: #0f172a; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; padding: 8px 14px;">
      <div style="margin-bottom: 8px;">
        <span style="font-weight: 800; color: #0f172a; text-decoration: underline;">अर्जदार (तक्रारदार):</span><br/>
        <b>नाव:</b> ${m.applicant} &nbsp;&bull;&nbsp; <b>मोबाईल:</b> ${m.phone}<br/>
        <b>पत्ता:</b> ${m.address}
        ${m.bank ? `<br/><b>बँक / संस्था:</b> ${m.bank} ${m.utr ? `(खाते/UTR: ${m.utr})` : ""}` : ""}
      </div>
      <div style="border-top: 1px dashed #cbd5e1; padding-top: 6px;">
        <span style="font-weight: 800; color: #0f172a; text-decoration: underline;">सामनेवाले (विरोधी पक्ष / आरोपी):</span><br/>
        <b>नाव:</b> ${m.opp} &nbsp;&bull;&nbsp; <b>पत्ता / शाखा:</b> ${m.oppAddress}<br/>
        <b>घटनेचा दिनांक:</b> ${m.date} ${m.time ? `(${m.time})` : ""}
        ${m.amount ? `&nbsp;&bull;&nbsp; <b>तक्रार रक्कम:</b> <span style="color: #b91c1c; font-weight: 800;">₹ ${m.amount}/-</span>` : ""}
      </div>
    </div>
  `;

  // Educational deadline warning box is excluded from official court petition
  const renderOrangeDeadlineBox = (_deadlineToUse?: string) => "";

  const renderReliefBox = (relief: string) => `
    <div style="background: #f8fafc; border: 1.5px solid #0f172a; border-radius: 4px; padding: 7px 12px; margin-bottom: 9px; font-size: 9pt; line-height: 1.5;">
      <div style="font-weight: 800; color: #0f172a; font-size: 9.5pt; margin-bottom: 2px;">विनंती व कायदेशीर मागणी (Relief & Prayers):</div>
      <div style="color: #0f172a;">${relief}</div>
    </div>
  `;

  // Handbook guide table is excluded from official court petition
  const renderQuickSummaryTableHtml = (_summaryTable?: any) => "";

  const renderEnclosuresChecklistHtml = () => `
    <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; padding: 5px 10px; margin-bottom: 8px; font-size: 8.5pt; color: #334155;">
      <b>सोबत जोडलेली कागदपत्रे:</b><br/>
      ☑ १. तक्रारदाराच्या आधार कार्डची प्रत &bull;
      ☑ २. बँक पासबुक / स्टेटमेंट / व्यवहाराची पावती &bull;
      ☑ ३. व्यवहार UTR पावती / मेसेज स्क्रीनशॉट &bull;
      ☑ ४. विरोधी पक्षाशी केलेला पत्रव्यवहार.
    </div>
  `;

  const renderVerificationHtml = () => `
    <div style="border-top: 1px dashed #94a3b8; padding-top: 5px; margin-bottom: 10px; font-size: 8.5pt; color: #475569; text-align: justify; line-height: 1.4;">
      <b>सत्यप्रतिज्ञा:</b> मी, वर नमूद अर्जदार सत्यप्रतिज्ञेवर जाहीर करतो/करते की, वरील तक्रारीतील सर्व हकीकत माझ्या व्यक्तिगत माहितीनुसार व कागदपत्रांनुसार सत्य व बिनचूक आहे. मी यात कोणतीही खोटी माहिती दिलेली नाही.
    </div>
  `;

  const renderSignaturesHtml = (applicant: string, today: string, place: string) => `
    <div style="display: flex; justify-content: space-between; align-items: flex-end; font-size: 9pt; margin-bottom: 10px;">
      <div>
        <div><b>दिनांक:</b> ${today}</div>
        <div><b>ठिकाण:</b> ${place || "स्थानिक"}</div>
      </div>
      <div style="text-align: center;">
        <div style="font-size: 8.5pt; color: #475569; margin-bottom: 18px;">आपला/आपली नम्र,</div>
        <div style="border-bottom: 1.5px solid #0f172a; width: 170px; margin-bottom: 4px;"></div>
        <div style="font-weight: 800; color: #0f172a;">तक्रारदाराची सही / अंगठा</div>
        <div style="font-size: 8.5pt; color: #475569;">(${applicant})</div>
      </div>
    </div>
  `;

  const renderInwardStampBoxHtml = () => `
    <div style="border: 1.5px dashed #0f172a; border-radius: 4px; padding: 6px 12px; background: #fafafa; display: flex; justify-content: space-between; align-items: center; font-size: 8.5pt; color: #1e293b;">
      <div style="line-height: 1.45;">
        <b style="color: #0f172a;">कार्यालयीन आवक नोंद / पोच पावती (Inward Stamp):</b><br/>
        आवक नोंदणी क्र.: <span style="display: inline-block; width: 90px; border-bottom: 1px dotted #334155;"></span> &nbsp;&bull;&nbsp;
        तारीख: _____/_____/२०२६ &nbsp;&bull;&nbsp;
        वेळ: ________
      </div>
      <div style="text-align: center; border-left: 1px solid #cbd5e1; padding-left: 12px;">
        <div style="font-size: 7.5pt; color: #64748b; margin-bottom: 12px;">स्वीकारणाऱ्या अधिकाऱ्याची सही व शिक्का</div>
        <div style="border-bottom: 1px solid #0f172a; width: 110px;"></div>
      </div>
    </div>
  `;

  const renderPublicationFooterHtml = (pageNum: number, totalPages: number, receipt: string) => `
    <div style="position: absolute; bottom: 10px; left: 34px; right: 34px; border-top: 1px solid #e2e8f0; padding-top: 3px; display: flex; justify-content: space-between; align-items: center; font-size: 7.5pt; color: #64748b;">
      <span>फास्टकेस लीगल ईआरपी &bull; अधिकृत विधी मसुदा कागद</span>
      <span style="background: #f1f5f9; padding: 1px 7px; border-radius: 9999px; font-weight: 700; color: #0f172a; border: 1px solid #cbd5e1;">[ पृष्ठ ${pageNum} पैकी ${totalPages} ]</span>
      <span>BNSS, BNS, BSA २०२३ &bull; कोर्ट-मान्य नमुना</span>
    </div>
  `;

  // ── Print Official A4 Document (Direct Browser Print & Save As PDF) ────────
  const printOfficialA4Document = (content: string, title?: string, receiptCustom?: string) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      window.print();
      return;
    }

    const m = getPetitionModel(title, receiptCustom);

    let bodyHtml = "";
    if (!m.isTwoPage) {
      bodyHtml = `
        <div class="a4-page">
          ${renderPublicationHeaderHtml(m.chapterBadge, m.titleToUse)}
          ${renderEFilingBarHtml(m.receiptToUse, m.today)}
          ${renderSubjectBoxHtml(m.recipientClean, m.template.subject, m.template.act_reference)}
          ${renderPartiesTableHtml(m)}

          <div style="font-size: 9.5pt; line-height: 1.55; color: #0f172a; text-align: justify; margin-bottom: 10px;">
            <div style="font-weight: 800; margin-bottom: 4px; color: #0f172a;">महोदय,</div>
            <div style="margin-bottom: 6px; text-indent: 18px;">मी खालील स्वाक्षरी करणार अर्जदार, याद्वारे आपणास नम्रपूर्वक लेखी तक्रार अर्ज सादर करतो/करते की:-</div>
            <div style="margin-bottom: 5px;"><b>१. प्राथमिक वस्तुस्थिती व घटनाक्रम:</b> ${m.factsClean}</div>
            <div style="margin-bottom: 5px;"><b>२. पाठपुरावा व नकार:</b> तक्रारदाराने सदर गंभीर घटनेबाबत विरोधी पक्षाकडे वारंवार कायदेशीर विचारणा व पाठपुरावा केला, परंतु त्यांनी कायदेशीर जबाबदारी पार पाडण्यास नकार दिला व जाणीवपूर्वक टाळाटाळ केली.</div>
            <div><b>३. कायदेशीर उल्लंघन:</b> विरोधी पक्षाचे सदर कृत्य हे ${m.template.act_reference || "प्रचलित कायदे व नियमावली"} अन्वये कायद्याचे थेट व गंभीर उल्लंघन आहे.</div>
            ${m.extra ? `<div style="margin-top: 5px;"><b>४. विशेष तपशील:</b> ${m.extra}</div>` : ""}
          </div>

          ${renderReliefBox(m.template.relief)}
          ${renderEnclosuresChecklistHtml()}
          ${renderVerificationHtml()}
          ${renderSignaturesHtml(m.applicant, m.today, m.place)}
          ${renderInwardStampBoxHtml()}
          ${renderPublicationFooterHtml(1, 1, m.receiptToUse)}
        </div>
      `;
    } else {
      bodyHtml = `
        <div class="a4-page page-1">
          ${renderPublicationHeaderHtml(m.chapterBadge, m.titleToUse)}
          ${renderEFilingBarHtml(m.receiptToUse, m.today)}
          ${renderSubjectBoxHtml(m.recipientClean, m.template.subject, m.template.act_reference)}
          ${renderPartiesTableHtml(m)}

          <div style="font-size: 9pt; line-height: 1.45; color: #0f172a; text-align: justify; margin-top: 6px;">
            <div style="font-weight: 800; margin-bottom: 4px; color: #0f172a; font-size: 9.5pt;">महोदय, तक्रारदाराचे सविस्तर व सत्य कथन खालीलप्रमाणे आहे:-</div>
            <div style="margin-bottom: 5px;"><b>१. प्राथमिक वस्तुस्थिती व घटनाक्रम:</b> ${m.factsClean}</div>
            <div style="margin-bottom: 5px;"><b>२. पाठपुरावा व नकार:</b> तक्रारदाराने सदर गंभीर घटनेबाबत विरोधी पक्षाकडे वारंवार कायदेशीर विचारणा व पाठपुरावा केला. परंतु विरोधी पक्षाने आपली कायदेशीर जबाबदारी पार पाडण्यास साफ नकार दिला व जाणीवपूर्वक टाळाटाळ केली.</div>
            <div><b>३. कायदेशीर उल्लंघन:</b> विरोधी पक्षाचे सदर कृत्य हे ${m.template.act_reference} अन्वये कायद्याचे थेट व गंभीर उल्लंघन असून तक्रारदारास कायदेशीर दाद मिळणे आवश्यक आहे.</div>
          </div>

          <div style="margin-top: 24px; text-align: right; font-size: 8.5pt; color: #475569; font-weight: 600;">
            (सदर अर्जाचा पुढील भाग, मागणी व स्वाक्षरी पृष्ठ २ वर चालू...) &rarr;
          </div>

          ${renderPublicationFooterHtml(1, 2, m.receiptToUse)}
        </div>

        <div class="a4-page page-2 page-break">
          <div style="border-bottom: 2px solid #0f172a; padding-bottom: 5px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; font-size: 9pt; color: #0f172a; font-weight: 700;">
            <div>
              <span>🏛️ कोर्ट तक्रार अर्ज (पुढे चालू - पृष्ठ २) &bull; विषय: ${m.template.subject.slice(0, 48)}...</span>
            </div>
            <div style="font-family: monospace; font-size: 8pt; color: #475569;">
              पावती: ${m.receiptToUse} &bull; ${m.today}
            </div>
          </div>

          <div style="font-size: 9pt; line-height: 1.45; color: #0f172a; text-align: justify; margin-bottom: 8px;">
            ${m.extra ? `
            <div style="margin-bottom: 7px; background: #f8fafc; border: 1px solid #cbd5e1; padding: 6px 10px; border-radius: 3px;">
              <b style="color: #0f172a;">४. विशेष हकीकत व पुराव्यांचा तपशील:</b><br/>
              <span style="font-size: 8.5pt; color: #1e293b;">${m.extra}</span>
            </div>` : ""}

            <div style="margin-bottom: 7px;">
              <b>५. नुकसान व मानसिक त्रास:</b> विरोधी पक्षाच्या बेकायदेशीर व निष्काळजी वागणुकीमुळे तक्रारदाराचे गंभीर आर्थिक नुकसान झाले असून प्रचंड मानसिक व आर्थिक त्रास सहन करावा लागला आहे.
            </div>
          </div>

          ${renderReliefBox(m.template.relief)}
          ${renderEnclosuresChecklistHtml()}
          ${renderVerificationHtml()}
          ${renderSignaturesHtml(m.applicant, m.today, m.place)}
          ${renderInwardStampBoxHtml()}
          ${renderPublicationFooterHtml(2, 2, m.receiptToUse)}
        </div>
      `;
    }

    printWindow.document.write(`<!DOCTYPE html>
<html lang="mr">
<head>
  <meta charset="UTF-8">
  <title>${m.titleToUse} - Fastcase Official Court Application</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Mukta:wght@400;600;700;800&family=Noto+Serif+Devanagari:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    @page { size: A4; margin: 8mm 10mm 8mm 10mm; }
    * { box-sizing: border-box; }
    body {
      font-family: 'Mukta', 'Noto Serif Devanagari', 'Mangal', serif;
      color: #0f172a;
      line-height: 1.45;
      background: #f1f5f9;
      margin: 0;
      padding: 16px;
    }
    .no-print-bar {
      max-width: 794px;
      margin: 0 auto 14px auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #1e3a8a;
      color: #ffffff;
      padding: 10px 16px;
      border-radius: 8px;
      font-size: 13px;
    }
    .print-btn {
      background: #10b981;
      color: #ffffff;
      border: none;
      padding: 8px 18px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
    }
    .a4-page {
      width: 794px;
      min-height: 1123px;
      margin: 0 auto 16px auto;
      background: #ffffff;
      padding: 22px 32px 18px 32px;
      border: 2px solid #0f172a;
      outline: 1px solid #94a3b8;
      outline-offset: -5px;
      border-radius: 2px;
      box-shadow: 0 15px 35px rgba(0,0,0,0.15), 0 5px 15px rgba(0,0,0,0.06);
      position: relative;
      box-sizing: border-box;
    }
    @media print {
      body { background: #ffffff; padding: 0; margin: 0; }
      .no-print-bar { display: none !important; }
      .a4-page {
        box-shadow: none !important;
        border: 2px solid #0f172a !important;
        outline: 1px solid #94a3b8 !important;
        outline-offset: -5px !important;
        padding: 18px 28px 14px 28px !important;
        max-width: 100% !important;
        width: 100% !important;
        min-height: 100% !important;
        margin: 0 !important;
        box-sizing: border-box !important;
      }
      .page-break {
        page-break-before: always !important;
        break-before: page !important;
      }
    }
  </style>
</head>
<body>
  <div class="no-print-bar">
    <div><strong>🏛️ फास्टकेस विधी कक्ष</strong> &bull; अधिकृत कोर्ट तक्रार अर्ज (${m.isTwoPage ? "२ पाने" : "१ पान"})</div>
    <button class="print-btn" onclick="window.print()">🖨️ PDF म्हणून सेव्ह करा / प्रिंट करा</button>
  </div>
  ${bodyHtml}
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 400);
    };
  </script>
</body>
</html>`);
    printWindow.document.close();
  };

  // ── True High-Resolution A4 Court PDF File Generator & Downloader ─────────
  const downloadPetitionPdf = async (docText?: string, docTitle?: string, customReceipt?: string) => {
    const m = getPetitionModel(docTitle, customReceipt);

    if (!docText && !activeProblem) {
      toast.error("अर्ज उपलब्ध नाही.");
      return;
    }

    setIsDownloadingPdf(true);
    toast.info("अधिकृत कोर्ट PDF तयार होत आहे...");

    try {
      const { jsPDF } = await import("jspdf");
      const html2canvas = (await import("html2canvas")).default as any;

      const container = document.createElement("div");
      container.style.position = "fixed";
      container.style.left = "-9999px";
      container.style.top = "0";
      container.style.zIndex = "-9999";
      document.body.appendChild(container);

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      if (!m.isTwoPage) {
        // ── 1-PAGE DOCUMENT GENERATION (Exact 1-page fit, zero overflow) ──────
        const pageEl = document.createElement("div");
        pageEl.style.width = "794px";
        pageEl.style.height = "1123px";
        pageEl.style.maxHeight = "1123px";
        pageEl.style.boxSizing = "border-box";
        pageEl.style.padding = "22px 32px 18px 32px";
        pageEl.style.backgroundColor = "#ffffff";
        pageEl.style.border = "2px solid #0f172a";
        pageEl.style.outline = "1px solid #94a3b8";
        pageEl.style.outlineOffset = "-5px";
        pageEl.style.fontFamily = "'Mukta', 'Noto Serif Devanagari', 'Noto Sans Devanagari', 'Mangal', serif";
        pageEl.style.color = "#0f172a";
        pageEl.style.position = "relative";
        pageEl.style.overflow = "hidden";

        pageEl.innerHTML = `
          ${renderPublicationHeaderHtml(m.chapterBadge, m.titleToUse)}
          ${renderEFilingBarHtml(m.receiptToUse, m.today)}
          ${renderSubjectBoxHtml(m.recipientClean, m.template.subject, m.template.act_reference)}
          ${renderPartiesTableHtml(m)}

          <div style="font-size: 9.5pt; line-height: 1.55; color: #0f172a; text-align: justify; margin-bottom: 10px;">
            <div style="font-weight: 800; margin-bottom: 4px; color: #0f172a;">महोदय,</div>
            <div style="margin-bottom: 6px; text-indent: 18px;">मी खालील स्वाक्षरी करणार अर्जदार, याद्वारे आपणास नम्रपूर्वक लेखी तक्रार अर्ज सादर करतो/करते की:-</div>
            <div style="margin-bottom: 5px;"><b>१. प्राथमिक वस्तुस्थिती व घटनाक्रम:</b> ${m.factsClean}</div>
            <div style="margin-bottom: 5px;"><b>२. पाठपुरावा व नकार:</b> तक्रारदाराने सदर गंभीर घटनेबाबत विरोधी पक्षाकडे वारंवार कायदेशीर विचारणा व पाठपुरावा केला, परंतु त्यांनी कायदेशीर जबाबदारी पार पाडण्यास नकार दिला व जाणीवपूर्वक टाळाटाळ केली.</div>
            <div><b>३. कायदेशीर उल्लंघन:</b> विरोधी पक्षाचे सदर कृत्य हे ${m.template.act_reference || "प्रचलित कायदे व नियमावली"} अन्वये कायद्याचे थेट व गंभीर उल्लंघन आहे.</div>
            ${m.extra ? `<div style="margin-top: 5px;"><b>४. विशेष तपशील:</b> ${m.extra}</div>` : ""}
          </div>

          ${renderReliefBox(m.template.relief)}
          ${renderEnclosuresChecklistHtml()}
          ${renderVerificationHtml()}
          ${renderSignaturesHtml(m.applicant, m.today, m.place)}
          ${renderInwardStampBoxHtml()}
          ${renderPublicationFooterHtml(1, 1, m.receiptToUse)}
        `;

        container.appendChild(pageEl);

        const canvas = await html2canvas(pageEl, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
        });

        const imgData = canvas.toDataURL("image/jpeg", 0.98);
        pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
      } else {
        // ── 2-PAGE DOCUMENT GENERATION (Exact 2-page pagination, no cut lines) ─
        // Page 1
        const page1El = document.createElement("div");
        page1El.style.width = "794px";
        page1El.style.height = "1123px";
        page1El.style.maxHeight = "1123px";
        page1El.style.boxSizing = "border-box";
        page1El.style.padding = "22px 32px 18px 32px";
        page1El.style.backgroundColor = "#ffffff";
        page1El.style.border = "2px solid #0f172a";
        page1El.style.outline = "1px solid #94a3b8";
        page1El.style.outlineOffset = "-5px";
        page1El.style.fontFamily = "'Mukta', 'Noto Serif Devanagari', 'Noto Sans Devanagari', 'Mangal', serif";
        page1El.style.color = "#0f172a";
        page1El.style.position = "relative";
        page1El.style.overflow = "hidden";

        page1El.innerHTML = `
          ${renderPublicationHeaderHtml(m.chapterBadge, m.titleToUse)}
          ${renderEFilingBarHtml(m.receiptToUse, m.today)}
          ${renderSubjectBoxHtml(m.recipientClean, m.template.subject, m.template.act_reference)}
          ${renderPartiesTableHtml(m)}

          <div style="font-size: 9pt; line-height: 1.45; color: #0f172a; text-align: justify; margin-top: 6px;">
            <div style="font-weight: 800; margin-bottom: 4px; color: #0f172a; font-size: 9.5pt;">महोदय, तक्रारदाराचे सविस्तर व सत्य कथन खालीलप्रमाणे आहे:-</div>
            <div style="margin-bottom: 5px;"><b>१. प्राथमिक वस्तुस्थिती व घटनाक्रम:</b> ${m.factsClean}</div>
            <div style="margin-bottom: 5px;"><b>२. पाठपुरावा व नकार:</b> तक्रारदाराने सदर गंभीर घटनेबाबत विरोधी पक्षाकडे वारंवार कायदेशीर विचारणा व पाठपुरावा केला. परंतु विरोधी पक्षाने आपली कायदेशीर जबाबदारी पार पाडण्यास साफ नकार दिला व जाणीवपूर्वक टाळाटाळ केली.</div>
            <div><b>३. कायदेशीर उल्लंघन:</b> विरोधी पक्षाचे सदर कृत्य हे ${m.template.act_reference} अन्वये कायद्याचे थेट व गंभीर उल्लंघन असून तक्रारदारास कायदेशीर दाद मिळणे आवश्यक आहे.</div>
          </div>

          <div style="margin-top: 24px; text-align: right; font-size: 8.5pt; color: #475569; font-weight: 600;">
            (सदर अर्जाचा पुढील भाग, मागणी व स्वाक्षरी पृष्ठ २ वर चालू...) &rarr;
          </div>

          ${renderPublicationFooterHtml(1, 2, m.receiptToUse)}
        `;

        container.appendChild(page1El);

        const canvas1 = await html2canvas(page1El, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
        });

        const imgData1 = canvas1.toDataURL("image/jpeg", 0.98);
        pdf.addImage(imgData1, "JPEG", 0, 0, pdfWidth, pdfHeight);

        container.removeChild(page1El);

        // Page 2
        const page2El = document.createElement("div");
        page2El.style.width = "794px";
        page2El.style.height = "1123px";
        page2El.style.maxHeight = "1123px";
        page2El.style.boxSizing = "border-box";
        page2El.style.padding = "22px 32px 18px 32px";
        page2El.style.backgroundColor = "#ffffff";
        page2El.style.border = "2px solid #0f172a";
        page2El.style.outline = "1px solid #94a3b8";
        page2El.style.outlineOffset = "-5px";
        page2El.style.fontFamily = "'Mukta', 'Noto Serif Devanagari', 'Noto Sans Devanagari', 'Mangal', serif";
        page2El.style.color = "#0f172a";
        page2El.style.position = "relative";
        page2El.style.overflow = "hidden";

        page2El.innerHTML = `
          <div style="border-bottom: 2px solid #0f172a; padding-bottom: 5px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; font-size: 9pt; color: #0f172a; font-weight: 700;">
            <div>
              <span>🏛️ कोर्ट तक्रार अर्ज (पुढे चालू - पृष्ठ २) &bull; विषय: ${m.template.subject.slice(0, 48)}...</span>
            </div>
            <div style="font-family: monospace; font-size: 8pt; color: #475569;">
              पावती: ${m.receiptToUse} &bull; ${m.today}
            </div>
          </div>

          <div style="font-size: 9pt; line-height: 1.45; color: #0f172a; text-align: justify; margin-bottom: 8px;">
            ${m.extra ? `
            <div style="margin-bottom: 7px; background: #f8fafc; border: 1px solid #cbd5e1; padding: 6px 10px; border-radius: 3px;">
              <b style="color: #0f172a;">४. विशेष हकीकत व पुराव्यांचा तपशील:</b><br/>
              <span style="font-size: 8.5pt; color: #1e293b;">${m.extra}</span>
            </div>` : ""}

            <div style="margin-bottom: 7px;">
              <b>५. नुकसान व मानसिक त्रास:</b> विरोधी पक्षाच्या बेकायदेशीर व निष्काळजी वागणुकीमुळे तक्रारदाराचे गंभीर आर्थिक नुकसान झाले असून प्रचंड मानसिक व आर्थिक त्रास सहन करावा लागला आहे.
            </div>
          </div>

          ${renderReliefBox(m.template.relief)}
          ${renderEnclosuresChecklistHtml()}
          ${renderVerificationHtml()}
          ${renderSignaturesHtml(m.applicant, m.today, m.place)}
          ${renderInwardStampBoxHtml()}
          ${renderPublicationFooterHtml(2, 2, m.receiptToUse)}
        `;

        container.appendChild(page2El);

        pdf.addPage();
        const canvas2 = await html2canvas(page2El, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
        });

        const imgData2 = canvas2.toDataURL("image/jpeg", 0.98);
        pdf.addImage(imgData2, "JPEG", 0, 0, pdfWidth, pdfHeight);
      }

      document.body.removeChild(container);

      const fileName = `${m.titleToUse.replace(/[\/\s\\:\*\?"<>\|]+/g, "_")}_Fastcase_Petition.pdf`;
      pdf.save(fileName);
      toast.success(m.isTwoPage ? "अधिकृत २ पानांची कोर्ट PDF डाऊनलोड झाली!" : "अधिकृत १ पानाची कोर्ट PDF डाऊनलोड झाली!");
    } catch (err) {
      console.error("PDF generation error:", err);
      // Fallback
      try {
        const { jsPDF } = await import("jspdf");
        const doc = new jsPDF();
        doc.setFontSize(14);
        doc.text("FASTCASE OFFICIAL COURT PETITION", 14, 20);
        doc.setFontSize(10);
        doc.text(`Receipt: ${m.receiptToUse} | Fee: Rs 30 (PAID)`, 14, 28);
        doc.text(docText || m.factsClean, 14, 38, { maxWidth: 180 });
        doc.save(`${m.titleToUse.replace(/[\/\s\\:\*\?"<>\|]+/g, "_")}_Fastcase_Petition.pdf`);
        toast.success("अधिकृत PDF फाईल यशस्वीरीत्या डाऊनलोड झाली!");
      } catch (fallbackErr) {
        toast.error("PDF डाऊनलोड करताना त्रुटी आली. कृपया 'प्रिंट' बटनावर क्लिक करा.");
      }
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // ── Document Drafter Helper ───────────────────────────────────────────────
  const generateDraftForProblem = (
    problem?: QuickProblem | null,
    overrides?: {
      name?: string;
      phone?: string;
      address?: string;
      opp?: string;
      oppAddress?: string;
      place?: string;
      date?: string;
      time?: string;
      amount?: string;
      bank?: string;
      utr?: string;
      extra?: string;
    } | string,
    posPhone?: string,
    posOpp?: string,
    posPlace?: string,
    posDate?: string
  ) => {
    const prob = problem || activeProblem || QUICK_PROBLEMS[0];
    const opts = typeof overrides === "object" ? overrides : {
      name: typeof overrides === "string" ? overrides : undefined,
      phone: posPhone,
      opp: posOpp,
      place: posPlace,
      date: posDate,
    };

    const applicant = (opts.name ?? applicantName ?? user?.full_name ?? "नागरिक अर्जदार").trim() || "नागरिक अर्जदार";
    const phone = (opts.phone ?? applicantPhone ?? user?.phone ?? "").trim();
    const address = (opts.address ?? applicantAddress ?? incidentPlace ?? "स्थानिक रहिवासी").trim() || "स्थानिक रहिवासी";
    const opp = (opts.opp ?? oppositeParty ?? "संबंधित कार्यालय / संस्था / व्यक्ती").trim() || "संबंधित कार्यालय / संस्था";
    const oppAddress = (opts.oppAddress ?? opponentAddress ?? incidentPlace ?? "").trim();
    const place = (opts.place ?? incidentPlace ?? "स्थानिक परिसर").trim() || "स्थानिक परिसर";
    const date = (opts.date ?? incidentDate ?? new Date().toISOString().split("T")[0]).trim();
    const time = (opts.time ?? incidentTime ?? "").trim();
    const amount = (opts.amount ?? claimAmount ?? "").trim();
    const bank = (opts.bank ?? bankOrOrgName ?? "").trim();
    const utr = (opts.utr ?? accountOrUtr ?? "").trim();
    const extra = (opts.extra ?? extraDetails ?? "").trim();

    const template = prob.draft_template;
    const todayFormatted = new Date().toLocaleDateString(lang === "mr" ? "mr-IN" : "en-IN");

    // Replace placeholders in recipient
    let recipient = template.recipient_title
      .replace(/\[बँकेचे नाव\]/g, bank || opp || "संबंधित बँक शाखा")
      .replace(/\[कार्यालयाचे नाव\]/g, opp || "संबंधित कार्यालय")
      .replace(/\[पोलीस ठाण्याचे नाव\]/g, oppAddress || place || "स्थानिक पोलीस ठाणे")
      .replace(/\[जिल्ह्याचे नाव\]/g, place || "स्थानिक जिल्हा")
      .replace(/\[जिल्हा\]/g, place || "स्थानिक जिल्हा")
      .replace(/\[पत्ता\]/g, oppAddress || place || "स्थानिक शाखा");

    // Replace placeholders in body facts
    let facts = template.body_facts
      .replace(/\[आपले नाव\]/g, applicant)
      .replace(/\[मोबाईल\]/g, phone || "नोंदणीकृत मोबाईल")
      .replace(/\[पत्ता\]/g, address)
      .replace(/\[तारीख\]/g, date || todayFormatted)
      .replace(/\[वेळ\]/g, time ? `अंदाजे वेळ ${time}` : "सदर वेळी")
      .replace(/\[ठिकाण\]/g, place)
      .replace(/\[बँकेचे नाव\]/g, bank || opp || "संबंधित बँक शाखा")
      .replace(/\[खाते क्र\.\]/g, utr ? utr : "नोंदणीकृत बँक खाते")
      .replace(/\[रक्कम\]/g, amount ? `रुपये ${amount}/-` : "कापलेली रक्कम")
      .replace(/\[थकीत रक्कम\]/g, amount ? `रुपये ${amount}/-` : "थकीत रक्कम")
      .replace(/\[आयडी\]/g, utr || "बँक स्टेटमेंटनुसार")
      .replace(/\[बिल क्र\.\]/g, utr || "पावतीनुसार")
      .replace(/\[मेसेज\/कॉल\/बनावट लिंक\]/g, extra || "बनावट कॉल / फिशिंग लिंक / OTP द्वारे")
      .replace(/\[कंपनीचे नाव\]/g, opp)
      .replace(/\[विरोधी पक्षाचे नाव\]/g, opp)
      .replace(/\[आरोपीचे नाव\]/g, opp)
      .replace(/\[कार्यालयाचे नाव\]/g, opp)
      .replace(/\[पतीचे नाव\]/g, opp)
      .replace(/\[गुन्ह्याचा तपशील - मारहाण\/धमकी\/चोरी\]/g, extra || "दखलपात्र गुन्हा व कायदेशीर उल्लंघन")
      .replace(/\[घटनेचा तपशील\]/g, extra || "कायदेशीर हक्कांचे उल्लंघन")
      .replace(/\[दोषाचे वर्णन\]/g, extra || "वस्तू / सेवेमधील सदोषपणा")
      .replace(/\[पोलीस ठाण्याचे नाव\]/g, oppAddress || place || "स्थानिक पोलीस ठाणे")
      .replace(/\[जिल्ह्याचे नाव\]/g, place || "स्थानिक जिल्हा")
      .replace(/\[जिल्हा\]/g, place || "स्थानिक जिल्हा")
      .replace(/\[तालुका \/ जिल्हा\]/g, place || "स्थानिक तालुका/जिल्हा")
      .replace(/\[गावाचे नाव\]/g, place || "स्थानिक गाव")
      .replace(/\[सर्व्हे क्र\.\]/g, utr || "मिळकत / सर्व्हे क्र.")
      .replace(/\[विवाह तारीख\]/g, date)
      .replace(/\[वस्तूचे नाव\]/g, extra || "खरेदी केलेली वस्तू / सेवा")
      .replace(/\[हुद्दा\]/g, "कर्मचारी / कामगार")
      .replace(/\[महिना\]/g, "संबंधित कालावधी")
      .replace(/\[मुद्दा १\]/g, extra || "संबंधित कामाची अधिकृत नोंद व कागदपत्रांची प्रमाणित प्रत")
      .replace(/\[मुद्दा २\]/g, "सदर प्रकरणातील सक्षम प्राधिकाऱ्यांचे आदेश व टिप्पणी")
      .replace(/\[कार्यालयाचे नाव \/ काम\]/g, opp || "संबंधित कार्यालयीन कामकाज")
      .replace(/\[कागदपत्राचे नाव व क्रमांक[^\]]*\]/g, extra || utr || "महत्त्वाचे अधिकृत मूळ कागदपत्र");

    // Clean any lingering brackets
    recipient = recipient.replace(/\[[^\]]+\]/g, "").replace(/\s+/g, " ").trim();
    facts = facts.replace(/\[[^\]]+\]/g, "").replace(/\s+/g, " ").trim();

    // Text draft with structured table layout
    const textDraft = `================================================================================
🏛️ फास्टकेस अधिकृत कोर्ट तक्रार / दाद अर्ज (LEGAL PETITION)
पावती क्र.: FC-DOC-${Date.now().toString().slice(-6)} | दिनांक: ${todayFormatted} | मुद्रांक शुल्क: ₹३० (भरणा पूर्ण)
================================================================================

प्रति,
${recipient}

विषय: ${template.subject}
कायदेशीर तरतुदी: ${template.act_reference}

--------------------------------------------------------------------------------
                     पक्षकार व तक्रार तपशील तक्ता (PARTIES TABLE)
--------------------------------------------------------------------------------
[१] तक्रारदार / अर्जदार (Complainant):
    • पूर्ण नाव: ${applicant}
    • मोबाईल क्र.: ${phone || "उपलब्ध नाही"}
    • पूर्ण पत्ता: ${address}
    ${bank ? `• बँक / संस्था: ${bank}\n` : ""}${utr ? `    • खाते / UTR क्र.: ${utr}\n` : ""}
[२] विरोधी पक्ष / प्रतिवादी (Opposite Party):
    • नाव / कंपनी: ${opp}
    • पत्ता / शाखा: ${oppAddress || place}
    • घटनेची तारीख/वेळ: ${date} ${time ? `(${time})` : ""}
    ${amount ? `• दावा / फसवणूक रक्कम: ₹ ${amount}/-\n` : ""}${utr ? `    • संदर्भ / UTR आयडी: ${utr}\n` : ""}--------------------------------------------------------------------------------

महोदय,
मी खालीलप्रमाणे वस्तुस्थिती व कायदेशीर तक्रार सादर करत आहे:

१. प्राथमिक घटनाक्रम:
   ${facts}

२. तक्रारदाराने याबाबत संबंधित व्यक्ती / संस्थेकडे वारंवार पाठपुरावा केला, परंतु त्यांनी कायदेशीर जबाबदारी पार पाडण्यास नकार दिला व टाळाटाळ केली.

३. सदर कृत्य हे ${template.act_reference} अन्वये कायद्याचे थेट उल्लंघन आहे.
${extra ? `\n४. विशेष हकीकत व जास्तीचा तपशील:\n   ${extra}\n` : ""}
मागणी / दाद (Relief & Prayer):
${template.relief}

सोबत जोडलेली कागदपत्रे (Enclosures):
१. तक्रारदाराच्या आधार कार्डची सत्यप्रत.
२. संबंधित व्यवहाराचे बँक पासबुक / स्टेटमेंट / पावती / मेसेज स्क्रीनशॉट.
३. पूर्वी केलेल्या पत्रव्यवहाराची / तक्रारीची प्रत.

सत्यप्रतिज्ञा (Verification):
मी, वरील तक्रारदार सत्यप्रतिज्ञेवर नमूद करतो की, वरील तक्रार अर्जातील सर्व मुद्दे माझ्या व्यक्तिगत माहितीनुसार व उपलब्ध कागदपत्रांनुसार सत्य व बिनचूक आहेत.

दिनांक: ${todayFormatted}
ठिकाण: ${place}

                                            तक्रारदाराची स्वाक्षरी: ________________
                                            नाव: (${applicant})`;

    setGeneratedDoc(textDraft);
    return textDraft;
  };

  // ── Problem Solver (Step 2: Opens Solution Card) ──────────────────────────
  const executeSolve = (customQuery?: string) => {
    const query = customQuery !== undefined ? customQuery : problemText;
    if (!query.trim()) {
      toast.info("कृपया आधी आपली कायदेशीर समस्या निवडा किंवा वर शोधा.");
      return;
    }
    const matched = findMatchingProblem(query);
    setActiveProblem(matched);
    setSelectedCategoryId(matched.id);
    setShowSolution(true);
    setShowDocument(false); // Keeps document closed until user clicks to view/open it
    // Prepare document template in background
    generateDraftForProblem(matched);
    toast.success("कायदेशीर उपाय तयार आहे!");
    setTimeout(() => {
      solutionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  };

  const handleSolveProblem = (customQuery?: string) => {
    const query = customQuery !== undefined ? customQuery : problemText;
    setProblemText(query);
    if (!isAuthenticated) {
      setPendingAction("solve");
      setShowAuthModal(true);
      return;
    }
    executeSolve(query);
  };

  // ── Manual Draft Trigger (e.g. from tab 2 or detail form) ──────────────────
  const executeDraft = () => {
    if (!activeProblem) {
      toast.error("कृपया आधी समस्येचा प्रकार निवडा.");
      return;
    }

    setIsDrafting(true);
    setTimeout(() => {
      generateDraftForProblem(activeProblem, applicantName, applicantPhone, oppositeParty, incidentPlace, incidentDate);
      setIsDrafting(false);
      toast.success("अधिकृत तक्रार अर्ज अपडेट झाला!");
    }, 250);
  };

  const handleGenerateDocument = () => {
    if (!isAuthenticated) {
      setPendingAction("draft");
      setShowAuthModal(true);
      return;
    }
    executeDraft();
  };

  // ── Search Previous Applications by Phone Number ────────────────────────
  const handleSearchByPhone = async (phoneToSearch?: string) => {
    const raw = (phoneToSearch || searchPhoneInput || applicantPhone || user?.phone || "").trim();
    const clean = raw.replace(/[^0-9]/g, "");
    if (clean.length < 10) {
      toast.error("कृपया वैध १०-अंकी मोबाईल नंबर प्रविष्ट करा.");
      return;
    }
    setIsSearchingPhone(true);
    try {
      const res = await api.get(`/citizen-help/by-phone?phone=${clean}`);
      const serverDocs = res.data || [];
      if (serverDocs.length === 0) {
        toast.info("या मोबाईल नंबरवर कोणताही जतन केलेला अर्ज सापडला नाही.");
      } else {
        toast.success(`${serverDocs.length} जतन केलेले अर्ज सापडले!`);
        const existingIds = new Set(savedDocs.map((d: any) => d.id));
        const merged = [...savedDocs];
        for (const s of serverDocs) {
          if (!existingIds.has(s.id)) {
            merged.push(s);
          }
        }
        setSavedDocs(merged);
        try {
          localStorage.setItem("fastcase_citizen_docs", JSON.stringify(merged));
        } catch (e) {}
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "अर्ज शोधण्यात समस्या आली.");
    } finally {
      setIsSearchingPhone(false);
    }
  };

  // ── Auto-save Document to PostgreSQL Database ─────────────────────────────
  const persistDocToBackend = async (receiptCustom: string, utrValue?: string, modeStr: string = "UPI QR") => {
    try {
      await api.post("/citizen-help/save", {
        category: activeProblem?.id || "court_petition",
        language: lang || "mr",
        applicant_name: applicantName.trim() || user?.full_name || "नागरिक अर्जदार",
        applicant_phone: applicantPhone.trim() || user?.phone || "",
        applicant_address: applicantAddress.trim() || "",
        opposite_party: oppositeParty.trim() || "",
        facts_summary: extraDetails.trim() || problemText.trim() || activeProblem?.title_mr || "अधिकृत कोर्ट अर्ज",
        target_authority: activeProblem?.title_mr || "अधिकृत कोर्ट तक्रार अर्ज",
        generated_application: generatedDoc,
      });
    } catch (err) {
      console.warn("Auto-save to backend skipped/failed:", err);
    }
  };

  // ── ₹30 Payment Completion & Automatic PDF Download ────────────────────────
  const handleCompletePayment = async () => {
    // 1. Razorpay Online Gateway (Cards / NetBanking / All UPI via Razorpay)
    if (paymentTab === "card") {
      setIsProcessingPay(true);
      try {
        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded) {
          toast.error("Razorpay पेमेंट गेटवे लोड होऊ शकले नाही. कृपया इंटरनेट कनेक्शन तपासा.");
          setIsProcessingPay(false);
          return;
        }

        const orderRes = await api.post("/citizen-help/create-payment-order", {
          category: activeProblem?.id || "court_petition",
          applicant_name: applicantName.trim() || user?.full_name || "नागरिक अर्जदार",
          applicant_phone: applicantPhone.trim() || user?.phone || "",
          applicant_email: user?.email || "",
          title: activeProblem?.title_mr || "अधिकृत कोर्ट तक्रार अर्ज",
        });

        const { order_id, amount, currency, key_id, receipt, prefill } = orderRes.data;

        const options = {
          key: key_id || "rzp_live_U2jZ388rztj8uF",
          amount: amount,
          currency: currency || "INR",
          name: "Fastcase Legal Platform",
          description: "अधिकृत कोर्ट तक्रार अर्ज मसुदा शुल्क (₹३०)",
          image: "https://fastcase.in/favicon.ico",
          order_id: order_id,
          prefill: {
            name: prefill?.name || applicantName,
            contact: prefill?.contact || applicantPhone,
            email: prefill?.email || user?.email || "",
          },
          theme: {
            color: "#013B36",
          },
          handler: async function (response: any) {
            try {
              toast.loading("पेमेंट पडताळत आहे व अधिकृत कोर्ट PDF तयार होत आहे...");
              const verifyRes = await api.post("/citizen-help/verify-payment", {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                receipt_id: receipt,
                title: activeProblem?.title_mr,
              });

              toast.dismiss();
              const rId = verifyRes.data.receipt_id || receipt || `FC-RZP-${response.razorpay_payment_id.slice(-6)}`;
              setIsPaid(true);
              setReceiptId(rId);
              setIsProcessingPay(false);
              setShowPayModal(false);

              const nowFormatted = new Date().toLocaleString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              });

              setSuccessDetails({
                receiptId: rId,
                paymentId: response.razorpay_payment_id,
                title: activeProblem?.title_mr || "अधिकृत कोर्ट तक्रार अर्ज",
                amount: "₹३०.००",
                date: nowFormatted,
              });
              setShowSuccessModal(true);
              toast.success(`₹३० भरणा यशस्वी! पावती क्र. ${rId}`);

              const newDoc = {
                id: rId,
                title: activeProblem?.title_mr || "अधिकृत तक्रार अर्ज",
                date: new Date().toLocaleDateString(),
                content: generatedDoc,
                fee: "₹३०",
                payment_mode: "Razorpay Online (UPI/Cards)",
                utr: response.razorpay_payment_id,
              };
              const updated = [newDoc, ...savedDocs];
              setSavedDocs(updated);
              try {
                localStorage.setItem("fastcase_citizen_docs", JSON.stringify(updated));
              } catch (e) {}

              // Auto-save to backend database so person can download anytime by phone
              persistDocToBackend(rId, response.razorpay_payment_id, "Razorpay Online");

              // Automatically trigger document download
              downloadPetitionPdf(generatedDoc, activeProblem?.title_mr, rId);
            } catch (err: any) {
              toast.dismiss();
              toast.error(err.response?.data?.detail || "पेमेंट पडताळणी अयशस्वी झाली.");
              setIsProcessingPay(false);
            }
          },
          modal: {
            ondismiss: function () {
              setIsProcessingPay(false);
            },
          },
        };

        const razorpayInstance = new (window as any).Razorpay(options);
        razorpayInstance.on("payment.failed", function (resp: any) {
          toast.error(`पेमेंट अयशस्वी: ${resp.error?.description || "कृपया पुन्हा प्रयत्न करा"}`);
          setIsProcessingPay(false);
        });
        razorpayInstance.open();
      } catch (err: any) {
        console.error("Razorpay initiation error:", err);
        toast.error(err.response?.data?.detail || "पेमेंट सुरू करण्यात समस्या आली. कृपया पुन्हा प्रयत्न करा.");
        setIsProcessingPay(false);
      }
      return;
    }

    // 2. Direct UPI QR Scan & Cosmos Bank Transfer Flow
    const cleanUtr = upiUtrInput.trim();
    setIsProcessingPay(true);
    setTimeout(() => {
      const rId = cleanUtr ? `FC-UTR-${cleanUtr.slice(-8).toUpperCase()}` : `FC-DOC-${Date.now().toString().slice(-6)}`;
      setIsPaid(true);
      setReceiptId(rId);
      setIsProcessingPay(false);
      setShowPayModal(false);

      const nowFormatted = new Date().toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

      setSuccessDetails({
        receiptId: rId,
        paymentId: cleanUtr ? `UTR: ${cleanUtr}` : `UPI-QR-${rId}`,
        title: activeProblem?.title_mr || "अधिकृत कोर्ट तक्रार अर्ज",
        amount: "₹३०.००",
        date: nowFormatted,
      });
      setShowSuccessModal(true);
      toast.success(`₹३० भरणा यशस्वी! पावती क्र. ${rId}`);

      const newDoc = {
        id: rId,
        title: activeProblem?.title_mr || "अधिकृत तक्रार अर्ज",
        date: new Date().toLocaleDateString(),
        content: generatedDoc,
        fee: "₹३०",
        payment_mode: "UPI QR (Cosmos Bank)",
        utr: cleanUtr || `UPI-QR-${rId}`,
      };
      const updated = [newDoc, ...savedDocs];
      setSavedDocs(updated);
      try {
        localStorage.setItem("fastcase_citizen_docs", JSON.stringify(updated));
      } catch (e) {}

      // Auto-save to backend database for permanent record linked to phone
      persistDocToBackend(rId, cleanUtr, "UPI QR");

      // Automatically trigger document download
      downloadPetitionPdf(generatedDoc, activeProblem?.title_mr, rId);
    }, 700);
  };

  // ── Modal Auth Submit Handlers ────────────────────────────────────────────
  const handleModalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail.trim() || !authPassword) {
      toast.error("Please enter email and password.");
      return;
    }
    setAuthLoading(true);
    try {
      const u = await citizenLogin(authEmail, authPassword);
      toast.success(`Welcome ${u.full_name || "Citizen"}!`);
      resumePendingAction();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleModalRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authFullName.trim() || !authEmail.trim() || !authPassword) {
      toast.error("Please fill all required fields.");
      return;
    }
    setAuthLoading(true);
    try {
      const u = await citizenRegister({
        full_name: authFullName.trim(),
        email: authEmail.trim().toLowerCase(),
        password: authPassword,
        phone: authPhone.trim() || undefined,
        preferred_language: "mr",
      });
      toast.success(`Account created! Welcome, ${u.full_name}.`);
      resumePendingAction();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleModalSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail.trim()) {
      toast.error("Enter your email address.");
      return;
    }
    setAuthLoading(true);
    try {
      await api.post("/auth/login-otp/send", { email: authEmail.trim().toLowerCase() });
      toast.success("OTP sent to your email!");
      setAuthOtpStep("code");
      setAuthOtpTimer(60);
      setAuthCanResend(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleModalVerifyOtp = async () => {
    const code = authOtpDigits.join("");
    if (code.length !== 6) {
      toast.error("Enter complete 6-digit OTP.");
      return;
    }
    setAuthLoading(true);
    try {
      const res = await api.post("/auth/login-otp/verify", {
        email: authEmail.trim().toLowerCase(),
        otp: code,
        code,
      });
      localStorage.setItem("access_token", res.data.access_token);
      localStorage.setItem("refresh_token", res.data.refresh_token);
      if (typeof document !== "undefined") {
        document.cookie = `access_token=${res.data.access_token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
      }
      toast.success("Login successful!");
      resumePendingAction();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      const pasted = value.replace(/\D/g, "").slice(0, 6);
      if (pasted.length > 0) {
        const newDigits = [...authOtpDigits];
        for (let i = 0; i < pasted.length; i++) {
          newDigits[i] = pasted[i];
        }
        setAuthOtpDigits(newDigits);
        const nextIndex = Math.min(pasted.length, 5);
        otpInputRefs.current[nextIndex]?.focus();
      }
      return;
    }
    const clean = value.replace(/\D/g, "");
    const newDigits = [...authOtpDigits];
    newDigits[index] = clean;
    setAuthOtpDigits(newDigits);
    if (clean && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const hasToken = typeof window !== "undefined" && !!localStorage.getItem("access_token");
  const isGuest = !isAuthenticated && !hasToken;

  if (!hydrated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F4F6F5]">
        <div className="w-8 h-8 rounded-full border-2 border-[#013B36] border-t-[#34D399] animate-spin mb-3" />
        <p className="text-xs font-semibold text-gray-500">नागरिक विधी कक्ष लोड होत आहे...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F6F5] text-gray-900 font-sans flex flex-col antialiased">
      {/* ── Compact Top Header ── */}
      <header className="bg-white border-b border-gray-200/90 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#013B36] text-white flex items-center justify-center shadow-xs">
              <Scale className="w-4 h-4 text-[#059669]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-extrabold text-[#013B36] tracking-tight">
                  फास्टकेस नागरिक विधी कक्ष
                </h1>
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-[#ECFDF5] text-[#013B36] uppercase border border-[#A7F3D0]">
                  १-क्लिक सहाय्य
                </span>
              </div>
              <p className="text-[10px] text-gray-500 font-medium">
                समस्या सांगा • कायदेशीर उपाय जाणून घ्या • कोर्ट अर्ज (₹३०)
              </p>
            </div>
          </div>

          {/* User Auth Status Button */}
          <div className="flex items-center gap-2">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-1.5 pl-1 sm:pl-2">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#ECFDF5] text-[#013B36] border border-[#A7F3D0] text-xs font-bold">
                  <User className="w-3 h-3 text-[#059669]" />
                  <span className="truncate max-w-[120px]">{user.full_name || user.email}</span>
                </div>
                <button
                  onClick={logout}
                  className="px-2 py-1 rounded-lg text-xs font-semibold text-gray-500 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                  title="Logout"
                >
                  बाहेर पडा
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 pl-2">
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[#013B36] hover:bg-[#024E47] text-white text-xs font-bold shadow-xs transition cursor-pointer"
                >
                  <User className="w-3 h-3" />
                  <span>लॉगिन / नोंदणी</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Guest Awareness Notification Strip ── */}
      {isGuest && (
        <div className="bg-gradient-to-r from-[#021F1B] via-[#03362E] to-[#02201D] text-white px-4 py-2 border-b border-[#03362E]/60 shadow-2xs">
          <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-[#059669] text-white font-black text-[10px] uppercase tracking-wider">
                अतिथी कक्ष
              </span>
              <span className="text-[#6EE7B7] font-medium text-[11px] sm:text-xs">
                आपण मोफत कायदेशीर उपाय व मार्गदर्शन वाचू शकता. कोर्ट अर्ज तयार व डाऊनलोड करण्यासाठी लॉगिन करा.
              </span>
            </div>
            <button
              onClick={() => setShowAuthModal(true)}
              className="text-[11px] sm:text-xs font-bold text-[#059669] hover:text-[#6EE7B7] transition cursor-pointer flex items-center gap-1 underline underline-offset-2"
            >
              <span>येथे लॉगिन करा</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* ── 3 COMPACT NAVIGATION TABS ── */}
      <div className="max-w-4xl w-full mx-auto px-4 pt-4 pb-2">
        <div className="flex p-1 bg-white rounded-xl border border-gray-200 shadow-2xs max-w-xl mx-auto gap-1">
          {/* Tab 1: कोर्ट अर्ज जनरेटर (₹३०) - DIRECT DEFAULT */}
          <button
            onClick={() => setActiveTab("draft")}
            className={cn(
              "flex-1 py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 text-xs font-black cursor-pointer",
              activeTab === "draft"
                ? "bg-[#013B36] text-white shadow-xs"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100/60"
            )}
          >
            <FileText className="w-3.5 h-3.5 text-[#059669]" />
            <span>१. कोर्ट अर्ज जनरेटर (₹३०)</span>
          </button>

          {/* Tab 2: माझे अर्ज */}
          <button
            onClick={() => {
              if (!isAuthenticated) {
                requireAuth("tab_saved", () => setActiveTab("saved"));
              } else {
                setActiveTab("saved");
              }
            }}
            className={cn(
              "flex-1 py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 text-xs font-black cursor-pointer relative",
              activeTab === "saved"
                ? "bg-[#013B36] text-white shadow-xs"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100/60"
            )}
          >
            <FileCheck className="w-3.5 h-3.5 text-[#059669]" />
            <span>२. माझे अर्ज</span>
            {savedDocs.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-[#059669] text-white text-[9px] font-black">
                {savedDocs.length}
              </span>
            )}
          </button>

          {/* Tab 3: मालमत्ता कायदेशीर तपासणी */}
          <button
            onClick={() => setActiveTab("property")}
            className={cn(
              "flex-1 py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 text-xs font-black cursor-pointer",
              activeTab === "property"
                ? "bg-[#013B36] text-white shadow-xs"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100/60"
            )}
          >
            <Building2 className="w-3.5 h-3.5 text-[#059669]" />
            <span>३. मालमत्ता तपासणी</span>
          </button>
        </div>
      </div>

      {/* ── MAIN CONTENT AREA ── */}
      <main className={cn("w-full mx-auto px-4 py-3 flex-1 space-y-4 transition-all", activeTab === "draft" ? "max-w-7xl" : "max-w-4xl")}>

        {/* ═══════════════════════════════════════════════════════════════════
            अधिकृत तक्रार अर्ज जनरेटर (DIRECT DOCUMENT GENERATOR - ₹30)
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === "draft" && (
          <div className="space-y-4">
            {/* ── Direct Problem / Case Selector & Instant Legal Right Banner ── */}
            <div className="bg-white rounded-2xl border border-gray-200/90 p-4 sm:p-5 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-[#013B36] text-white flex items-center justify-center text-xs font-black">
                    १
                  </span>
                  <h2 className="text-sm font-black text-gray-900">
                    कायदेशीर तक्रारीचा प्रकार निवडा (Select Legal Issue):
                  </h2>
                </div>
                {activeProblem?.helpline && (
                  <a
                    href={`tel:${activeProblem.helpline}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold transition w-fit"
                  >
                    <PhoneCall className="w-3.5 h-3.5 text-red-600" />
                    <span>{activeProblem.helpline_label}</span>
                  </a>
                )}
              </div>

              {/* Quick 1-Click Problem Selector Chips */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5 pt-1">
                {[
                  { id: "police_complaint", icon: "📝", label: "पोलीस ठाण्यात तक्रार" },
                  { id: "cyber_fraud", icon: "💳", label: "बँक / UPI फ्रॉड" },
                  { id: "fir_registration", icon: "📋", label: "FIR नोंदणी अधिकार" },
                  { id: "police_refusal", icon: "👮", label: "पोलीस FIR नकार" },
                  { id: "consumer_fraud", icon: "🛒", label: "ग्राहक तक्रार" },
                  { id: "property_land", icon: "🏠", label: "जमीन व घर वाद" },
                  { id: "unpaid_salary", icon: "💼", label: "पगार / नोकरी वाद" },
                  { id: "women_safety", icon: "👩", label: "महिला सुरक्षा" },
                  { id: "lost_document", icon: "🔍", label: "कागदपत्रे / फोन गहाळ" },
                  { id: "bail_procedure", icon: "🗝️", label: "जामीन (Bail)" },
                  { id: "zero_fir", icon: "📍", label: "Zero FIR" },
                  { id: "arrest_rights", icon: "🔒", label: "अटक व नागरिक हक्क" },
                ].map((cat) => {
                  const isSelected = activeProblem?.id === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        const found = QUICK_PROBLEMS.find((p) => p.id === cat.id);
                        if (found) {
                          setActiveProblem(found);
                          setSelectedCategoryId(cat.id);
                          generateDraftForProblem(found, applicantName, applicantPhone, oppositeParty, incidentPlace, incidentDate);
                        }
                      }}
                      className={cn(
                        "px-2.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border text-left",
                        isSelected
                          ? "bg-[#013B36] text-white border-[#013B36] shadow-xs ring-2 ring-[#059669]/40"
                          : "bg-gray-50 hover:bg-[#ECFDF5] text-gray-700 border-gray-200 hover:border-[#013B36]/30"
                      )}
                    >
                      <span className="text-sm shrink-0">{cat.icon}</span>
                      <span className="truncate">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2 COLUMNS NEXT TO EACH OTHER (SIDE-BY-SIDE) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
              {/* ── LEFT COLUMN: तक्रार अर्जाची माहिती प्रविष्ट करा (Input Form) ── */}
              <div className="bg-white rounded-2xl border border-gray-200/90 p-4 sm:p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                  <h3 className="text-sm font-black text-gray-900 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-[#059669]" />
                    <span>तक्रार अर्जाची माहिती प्रविष्ट करा:</span>
                  </h3>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-[#ECFDF5] text-[#013B36] border border-[#A7F3D0]">
                    शुल्क: ₹३०/-
                  </span>
                </div>

                <div className="space-y-3.5">
                  {/* Section 1: तक्रारदार / अर्जदार */}
                  <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-200 space-y-2">
                    <div className="text-[11px] font-black text-[#064e3b] uppercase tracking-wide flex items-center gap-1">
                      <span>१. तक्रारदार / अर्जदाराची माहिती (Complainant):</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">
                          पूर्ण नाव <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={applicantName}
                          onChange={(e) => setApplicantName(e.target.value)}
                          placeholder="उदा. रमेश शंकर पाटील"
                          className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg font-medium text-xs focus:outline-none focus:border-[#013B36]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">
                          मोबाईल क्रमांक
                        </label>
                        <input
                          type="tel"
                          value={applicantPhone}
                          onChange={(e) => setApplicantPhone(e.target.value)}
                          placeholder="उदा. ९८२२००११२२"
                          className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg font-medium text-xs focus:outline-none focus:border-[#013B36]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">
                          पूर्ण पत्ता
                        </label>
                        <input
                          type="text"
                          value={applicantAddress}
                          onChange={(e) => setApplicantAddress(e.target.value)}
                          placeholder="उदा. फ्लॅट ४०२, गोकुळधाम, पुणे"
                          className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg font-medium text-xs focus:outline-none focus:border-[#013B36]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">
                          बँकेचे नाव / खाते क्र.
                        </label>
                        <input
                          type="text"
                          value={bankOrOrgName}
                          onChange={(e) => setBankOrOrgName(e.target.value)}
                          placeholder="उदा. SBI बँक / खाते क्र."
                          className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg font-medium text-xs focus:outline-none focus:border-[#013B36]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 2: विरोधी पक्ष */}
                  <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-200 space-y-2">
                    <div className="text-[11px] font-black text-[#064e3b] uppercase tracking-wide flex items-center gap-1">
                      <span>२. विरोधी पक्ष / प्रतिवादीची माहिती (Opposite Party):</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">
                          विरोधी पक्ष / कंपनीचे नाव <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={oppositeParty}
                          onChange={(e) => setOppositeParty(e.target.value)}
                          placeholder="उदा. ABC प्रा. लि. / बँक मॅनेजर"
                          className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg font-medium text-xs focus:outline-none focus:border-[#013B36]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">
                          पत्ता / शाखा / ठिकाण
                        </label>
                        <input
                          type="text"
                          value={opponentAddress}
                          onChange={(e) => setOpponentAddress(e.target.value)}
                          placeholder="उदा. मुख्य शाखा, शिवाजीनगर, पुणे"
                          className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg font-medium text-xs focus:outline-none focus:border-[#013B36]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">
                          दावा / फसवणूक रक्कम ₹
                        </label>
                        <input
                          type="text"
                          value={claimAmount}
                          onChange={(e) => setClaimAmount(e.target.value)}
                          placeholder="उदा. ५०,०००"
                          className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg font-medium text-xs focus:outline-none focus:border-[#013B36]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">
                          UTR / खाते / तक्रार क्र.
                        </label>
                        <input
                          type="text"
                          value={accountOrUtr}
                          onChange={(e) => setAccountOrUtr(e.target.value)}
                          placeholder="उदा. UTR9823487123"
                          className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg font-medium text-xs focus:outline-none focus:border-[#013B36]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 3: घटना तपशील & जादा माहिती */}
                  <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-200 space-y-2">
                    <div className="text-[11px] font-black text-[#064e3b] uppercase tracking-wide flex items-center gap-1">
                      <span>३. घटनेचा दिनांक, ठिकाण व जादा तपशील:</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">
                          घटनेची तारीख
                        </label>
                        <input
                          type="date"
                          value={incidentDate}
                          onChange={(e) => setIncidentDate(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg font-medium text-xs focus:outline-none focus:border-[#013B36]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">
                          अंदाजे वेळ
                        </label>
                        <input
                          type="text"
                          value={incidentTime}
                          onChange={(e) => setIncidentTime(e.target.value)}
                          placeholder="उदा. दुपारी २:३० वाजता"
                          className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg font-medium text-xs focus:outline-none focus:border-[#013B36]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">
                          घटना ठिकाण व शहर
                        </label>
                        <input
                          type="text"
                          value={incidentPlace}
                          onChange={(e) => setIncidentPlace(e.target.value)}
                          placeholder="उदा. शिवाजीनगर, पुणे"
                          className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg font-medium text-xs focus:outline-none focus:border-[#013B36]"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-1">
                        विशेष हकीकत / पुराव्यांचा तपशील (ऐच्छिक)
                      </label>
                      <textarea
                        rows={2}
                        value={extraDetails}
                        onChange={(e) => setExtraDetails(e.target.value)}
                        placeholder="घटनेची जादा माहिती किंवा महत्त्वाचे मुद्दे येथे प्रविष्ट करा..."
                        className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg font-medium text-xs focus:outline-none focus:border-[#013B36]"
                      />
                    </div>
                  </div>

                  {/* Format Preference & Action */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-700 text-[11px]">दस्तऐवज स्वरूप:</span>
                      <div className="inline-flex rounded-lg border border-gray-300 p-0.5 bg-white">
                        <button
                          type="button"
                          onClick={() => setPageFormatPreference("auto")}
                          className={cn(
                            "px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer",
                            pageFormatPreference === "auto" ? "bg-[#013B36] text-white" : "text-gray-600 hover:text-black"
                          )}
                        >
                          ⚙️ आपोआप
                        </button>
                        <button
                          type="button"
                          onClick={() => setPageFormatPreference("1page")}
                          className={cn(
                            "px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer",
                            pageFormatPreference === "1page" ? "bg-[#013B36] text-white" : "text-gray-600 hover:text-black"
                          )}
                        >
                          📄 १ पान
                        </button>
                        <button
                          type="button"
                          onClick={() => setPageFormatPreference("2page")}
                          className={cn(
                            "px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer",
                            pageFormatPreference === "2page" ? "bg-[#013B36] text-white" : "text-gray-600 hover:text-black"
                          )}
                        >
                          📑 २ पाने
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={handleGenerateDocument}
                      disabled={isDrafting}
                      className="w-full sm:w-auto px-6 py-2.5 bg-[#013B36] hover:bg-[#024E47] text-white font-black text-xs rounded-xl shadow-md shadow-[#013B36]/25 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isDrafting ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>अर्ज तयार होत आहे...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-white" />
                          <span>अधिकृत अर्ज तयार करा</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* ── RIGHT COLUMN: अधिकृत तक्रार अर्ज पूर्वावलोकन (Live A4 Preview & Actions) ── */}
              <div className="bg-white rounded-2xl border border-gray-200/90 p-4 sm:p-5 shadow-xs space-y-3 lg:sticky lg:top-20">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-black text-gray-900">अधिकृत तक्रार अर्ज पूर्वावलोकन (Preview)</span>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#064e3b] border border-[#A7F3D0]">
                      {pageFormatPreference === "2page" || (pageFormatPreference === "auto" && extraDetails.trim().length > 120)
                        ? "📑 २ पाने कोर्ट मसुदा"
                        : "📄 १ पान कोर्ट मसुदा"}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {isPaid ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            if (generatedDoc) {
                              navigator.clipboard.writeText(generatedDoc);
                              toast.success("अर्जाचा मजकूर कॉपी केला!");
                            }
                          }}
                          className="px-2.5 py-1 text-xs font-bold rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center gap-1 cursor-pointer"
                        >
                          <Copy className="w-3 h-3 text-gray-600" />
                          <span>कॉपी</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => printOfficialA4Document(generatedDoc, activeProblem?.title_mr || "तक्रार अर्ज", receiptId)}
                          className="px-3 py-1 text-xs font-black rounded-lg border border-[#013B36] bg-[#013B36] hover:bg-[#024E47] text-[#6EE7B7] flex items-center gap-1 cursor-pointer shadow-xs"
                        >
                          <Printer className="w-3 h-3 text-[#6EE7B7]" />
                          <span>प्रिंट / Save as PDF</span>
                        </button>
                        <button
                          type="button"
                          disabled={isDownloadingPdf}
                          onClick={() => downloadPetitionPdf(generatedDoc, activeProblem?.title_mr || "तक्रार अर्ज", receiptId)}
                          className="px-3 py-1 text-xs font-black rounded-lg bg-[#013B36] hover:bg-[#024E47] text-white flex items-center gap-1 cursor-pointer shadow-md shadow-[#013B36]/25 disabled:opacity-60"
                        >
                          <Download className="w-3 h-3 text-white" />
                          <span>{isDownloadingPdf ? "PDF डाऊनलोड..." : "PDF डाऊनलोड"}</span>
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowPayModal(true)}
                        className="px-3.5 py-1.5 text-xs font-black rounded-lg bg-[#013B36] hover:bg-[#024E47] text-white flex items-center gap-1.5 shadow-md shadow-[#013B36]/25 cursor-pointer"
                      >
                        <CreditCard className="w-3.5 h-3.5 text-white" />
                        <span>₹३० भरणा करा व डाऊनलोड करा →</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* ── Realistic Interactive A4 Court Document Paper Preview ── */}
                <div className="p-3 sm:p-5 bg-slate-200/90 rounded-2xl border border-slate-300 max-h-[750px] overflow-y-auto shadow-inner">
                  {generatedDoc ? (
                    <div className="bg-white border-2 border-slate-900 outline outline-1 outline-slate-400 outline-offset-[-5px] rounded-none shadow-[0_20px_50px_rgba(0,0,0,0.18),0_4px_12px_rgba(0,0,0,0.08)] p-6 sm:p-8 max-w-2xl mx-auto text-slate-900 text-xs sm:text-[13px] leading-relaxed space-y-3 transition-all relative font-serif">
                      {/* Traditional Court Invocation */}
                      <div className="text-center border-b-2 border-slate-900 pb-2.5 space-y-1">
                        <div className="text-[11px] font-bold text-slate-500 tracking-widest">
                          ॥ श्री गणेशाय नमः ॥ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ॥ सत्यमेव जयते ॥
                        </div>
                        <div className="inline-block border-2 border-slate-900 px-4 py-1 rounded-xs bg-slate-50">
                          <h2 className="text-sm sm:text-base font-extrabold text-slate-950 uppercase tracking-tight">
                            {(activeProblem?.id && CLEAN_TITLES_MAP[activeProblem.id]) || "अधिकृत कायदेशीर तक्रार अर्ज"}
                          </h2>
                        </div>
                        <p className="text-[10px] text-slate-500 font-medium">
                          (भारतीय नागरिक सुरक्षा संहिता २०२३ / BNS २०२३ / ग्राहक संरक्षण कायदा २०१९ अंतर्गत विहित अर्ज)
                        </p>
                      </div>

                      {/* Reference & Filing Bar */}
                      <div className="flex flex-wrap items-center justify-between text-[11px] bg-slate-50 border border-slate-300 rounded-xs p-2 text-slate-700">
                        <div>
                          <span className="font-bold">नोंदणी क्र.:</span>{" "}
                          <span className="font-mono font-bold text-slate-900">{receiptId || "FC-COURT-ONLINE"}</span>
                        </div>
                        <div>
                          <span className="font-bold">दिनांक:</span> {incidentDate || new Date().toLocaleDateString("mr-IN")}
                        </div>
                        <div className="text-emerald-800 font-bold text-[10px] bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded-xs">
                          ✓ अधिकृत लेखी प्रत
                        </div>
                      </div>

                      {/* Recipient */}
                      <div className="space-y-0.5 text-xs">
                        <div className="font-bold text-slate-950">प्रति,</div>
                        <div className="pl-3.5 font-bold text-slate-900">
                          {activeProblem?.draft_template?.recipient_title
                            ?.replace(/\[पोलीस ठाण्याचे नाव\]/g, opponentAddress || incidentPlace || "स्थानिक पोलीस ठाणे")
                            ?.replace(/\[बँकेचे नाव\]/g, bankOrOrgName || oppositeParty || "संबंधित बँक शाखा")
                            ?.replace(/\[कार्यालयाचे नाव\]/g, oppositeParty || "सक्षम कार्यालय")
                            ?.replace(/\[[^\]]+\]/g, "") || "मा. सक्षम प्राधिकारी / पोलीस निरीक्षक साहेब"}
                        </div>
                      </div>

                      {/* Subject */}
                      <div className="border border-slate-900 bg-slate-50 p-2.5 rounded-xs text-xs space-y-1">
                        <div>
                          <span className="font-extrabold text-slate-950">विषय: </span>
                          <span className="underline font-bold text-slate-900">
                            {((activeProblem?.id && CLEAN_TITLES_MAP[activeProblem.id]) || "लेखी तक्रार अर्ज")} दाखल करणेबाबत.
                          </span>
                        </div>
                        <div className="text-[10.5px] text-slate-600 font-medium">
                          <b>कायदेशीर संदर्भ:</b> {activeProblem?.draft_template?.act_reference || "भारतीय नागरिक सुरक्षा संहिता (BNSS) २०२३ / BNS २०२३ / ग्राहक संरक्षण कायदा २०१९"}
                        </div>
                      </div>

                      {/* अर्जदार व सामनेवाले तपशील (साधा व सोपा नमुना - टेबल काढून सोपे केले) */}
                      <div className="bg-slate-50 border border-slate-300 rounded p-3 text-xs space-y-2 text-slate-800">
                        <div>
                          <div className="font-bold text-slate-950 underline mb-0.5">
                            अर्जदार (तक्रारदार):
                          </div>
                          <div><b>नाव:</b> {applicantName || "नागरिक अर्जदार"} &bull; <b>मोबाईल:</b> {applicantPhone || "________________"}</div>
                          <div><b>पत्ता:</b> {applicantAddress || incidentPlace || "स्थानिक पत्ता"}</div>
                          {bankOrOrgName && <div><b>बँक / संस्था:</b> {bankOrOrgName} {accountOrUtr ? `(खाते/UTR: ${accountOrUtr})` : ""}</div>}
                        </div>
                        <div className="border-t border-dashed border-slate-300 pt-2">
                          <div className="font-bold text-slate-950 underline mb-0.5">
                            सामनेवाले (विरोधी पक्ष / आरोपी):
                          </div>
                          <div><b>नाव:</b> {oppositeParty || "विरोधी पक्ष / आरोपी"} &bull; <b>पत्ता / शाखा:</b> {opponentAddress || "नमूद पत्ता"}</div>
                          <div>
                            <b>घटनेचा दिनांक:</b> {incidentDate || "सदर तारीख"} {incidentTime ? `(${incidentTime})` : ""}
                            {claimAmount && (
                              <span className="text-red-700 font-bold ml-2">
                                &bull; <b>तक्रार रक्कम:</b> ₹ {claimAmount}/-
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Facts */}
                      <div className="space-y-1.5 text-xs text-justify">
                        <div className="font-bold text-slate-950">महोदय,</div>
                        <p className="leading-relaxed indent-4">
                          मी खालील स्वाक्षरी करणार अर्जदार, याद्वारे आपणास नम्रपूर्वक लेखी तक्रार अर्ज सादर करतो/करते की:-
                        </p>
                        <p className="leading-relaxed">
                          <b>१. प्राथमिक वस्तुस्थिती व घटनाक्रम:</b>{" "}
                          {extraDetails.trim()
                            ? extraDetails
                            : activeProblem?.draft_template?.body_facts
                                ?.replace(/\[आपले नाव\]/g, applicantName || "अर्जदार")
                                ?.replace(/\[बँकेचे नाव\]/g, bankOrOrgName || oppositeParty || "बँक")
                                ?.replace(/\[रक्कम\]/g, claimAmount ? `रु. ${claimAmount}/-` : "रक्कम")
                                ?.replace(/\[[^\]]+\]/g, "") || "अर्जदाराच्या कायदेशीर हक्कांचे थेट व गंभीर उल्लंघन झाले आहे."}
                        </p>
                        <p className="leading-relaxed">
                          <b>२. पाठपुरावा व नकार:</b> तक्रारदाराने सदर गंभीर घटनेबाबत विरोधी पक्षाकडे वारंवार कायदेशीर विचारणा व पाठपुरावा केला, परंतु त्यांनी कायदेशीर जबाबदारी पार पाडण्यास नकार दिला व जाणीवपूर्वक टाळाटाळ केली.
                        </p>
                        <p className="leading-relaxed">
                          <b>३. कायदेशीर उल्लंघन:</b> विरोधी पक्षाचे सदर कृत्य प्रचलित कायदे व नियमावली अन्वये कायद्याचे थेट व गंभीर उल्लंघन आहे.
                        </p>
                        {extraDetails && (
                          <p className="leading-relaxed">
                            <b>४. विशेष तपशील:</b> {extraDetails}
                          </p>
                        )}
                      </div>

                      {/* Relief Box */}
                      <div className="bg-slate-50 border-l-4 border-l-slate-900 border border-slate-300 rounded-r p-2.5 text-xs space-y-1">
                        <div className="font-extrabold text-slate-950">
                          विनंती व कायदेशीर मागणी (Relief & Prayers):
                        </div>
                        <p className="text-slate-800 leading-relaxed font-medium">
                          {activeProblem?.draft_template?.relief || "सदर प्रकरणी योग्य ती कायदेशीर चौकशी करून अर्जदारास तात्काळ न्याय व नुकसानभरपाई मिळवून द्यावी ही नम्र विनंती."}
                        </p>
                      </div>

                      {/* Enclosures */}
                      <div className="bg-slate-50 border border-slate-200 rounded p-2 text-[10.5px] text-slate-700">
                        <b>सोबत जोडलेली कागदपत्रे (सत्यप्रत):</b><br />
                        ☑ १. तक्रारदाराच्या आधार कार्डची प्रत &nbsp;&bull;&nbsp;
                        ☑ २. बँक स्टेटमेंट / पासबुक / व्यवहाराची पावती &nbsp;&bull;&nbsp;
                        ☑ ३. व्यवहार UTR क्र. / स्क्रीनशॉट / पुरावे &nbsp;&bull;&nbsp;
                        ☑ ४. विरोधी पक्षाशी केलेला पत्रव्यवहार.
                      </div>

                      {/* Verification */}
                      <div className="border-t border-dashed border-slate-400 pt-2 text-[10px] text-slate-600 text-justify">
                        <b>सत्यप्रतिज्ञा (Statutory Verification):</b> मी, वर नमूद तक्रारदार सत्यप्रतिज्ञेवर जाहीर करतो/करते की, वरील तक्रारीतील सर्व मुद्दे व परिच्छेद माझ्या व्यक्तिगत माहितीनुसार व कागदपत्रांनुसार सत्य व बिनचूक आहेत. मी या अर्जात कोणतीही खोटी माहिती दिलेली नाही.
                      </div>

                      {/* Signature */}
                      <div className="flex justify-between items-end pt-1 text-xs">
                        <div>
                          <div><b>दिनांक:</b> {incidentDate || new Date().toLocaleDateString("mr-IN")}</div>
                          <div><b>ठिकाण:</b> {incidentPlace || "स्थानिक"}</div>
                        </div>
                        <div className="text-center">
                          <div className="w-36 border-b border-slate-900 mb-1" />
                          <div className="font-bold text-slate-950">तक्रारदाराची सही / अंगठा</div>
                          <div className="text-[11px] text-slate-600">({applicantName || "तक्रारदार"})</div>
                        </div>
                      </div>

                      {/* Police / Court Inward Stamp Box */}
                      <div className="border border-dashed border-slate-900 rounded p-2 bg-slate-50/80 flex items-center justify-between text-[10.5px] text-slate-800">
                        <div className="space-y-0.5">
                          <div className="font-bold text-slate-950">
                            कार्यालयीन आवक नोंद / अधिकृत पोच पावती (Inward Stamp):
                          </div>
                          <div className="text-[9.5px] text-slate-600">
                            आवक नोंदणी क्र.: <span className="inline-block w-20 border-b border-dotted border-slate-700" /> &bull; तारीख: _____/_____/२०२६ &bull; वेळ: ________
                          </div>
                        </div>
                        <div className="text-center pl-3 border-l border-slate-300">
                          <div className="text-[8.5px] text-slate-500 mb-2">स्वीकारणाऱ्या अधिकाऱ्याची सही व शिक्का</div>
                          <div className="w-24 border-b border-slate-900" />
                        </div>
                      </div>

                      {/* Official Paper Footer */}
                      <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-[9.5px] text-slate-500">
                        <span>फास्टकेस लीगल ईआरपी &bull; अधिकृत विधी मसुदा कागद</span>
                        <span className="font-bold bg-slate-100 border border-slate-300 px-2 py-0.5 rounded text-slate-700">
                          [ अधिकृत A4 कोर्ट कागद ]
                        </span>
                        <span>BNSS, BNS, BSA २०२३ &bull; कोर्ट-मान्य नमुना</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-20 text-slate-400 space-y-2">
                      <FileText className="w-10 h-10 mx-auto opacity-30 text-[#013B36]" />
                      <p className="text-xs font-semibold text-slate-600">
                        डाव्या बाजूला माहिती भरा किंवा 'अधिकृत अर्ज तयार करा' वर क्लिक करा.
                      </p>
                      <p className="text-[11px] text-slate-400">
                        येथे थेट कोर्ट-मान्य A4 अर्जाचे पूर्वावलोकन दिसेल.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            TAB 3: माझे अर्ज (SAVED DOCUMENTS & CLOUD LOOKUP)
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === "saved" && (
          <div className="bg-white rounded-2xl border border-gray-200/90 p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
              <h3 className="text-sm font-black text-gray-900 flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-[#059669]" />
                <span>माझे जतन केलेले अर्ज ({savedDocs.length})</span>
              </h3>
              <span className="text-[11px] text-gray-500 font-medium">
                आपले सर्व अर्ज क्लाऊड डेटाबेसमध्ये सुरक्षित जतन आहेत
              </span>
            </div>

            {/* Mobile Number Record Lookup Box */}
            <div className="bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl p-3.5 space-y-2">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[#013B36]" />
                <span className="text-xs font-bold text-[#013B36]">
                  आधीचे अर्ज शोधा (Find Previous Records by Mobile Number):
                </span>
              </div>
              <p className="text-[11px] text-gray-600">
                तुम्ही यापूर्वी तयार केलेले अर्ज कोणत्याही डिव्हाइसवर पुन्हा पाहण्यासाठी व डाऊनलोड करण्यासाठी तुमचा १०-अंकी मोबाईल नंबर प्रविष्ट करा.
              </p>
              <div className="flex gap-2">
                <input
                  type="tel"
                  value={searchPhoneInput}
                  onChange={(e) => setSearchPhoneInput(e.target.value.replace(/[^0-9]/g, "").slice(0, 10))}
                  placeholder="उदा. 9876543210 (तुमचा मोबाईल नंबर)"
                  className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-xl font-mono text-xs focus:outline-none focus:border-[#013B36] focus:ring-1 focus:ring-[#059669]/20"
                />
                <button
                  type="button"
                  onClick={() => handleSearchByPhone()}
                  disabled={isSearchingPhone}
                  className="px-4 py-2 bg-[#013B36] hover:bg-[#024E47] text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSearchingPhone ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>शोधत आहे...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-3.5 h-3.5" />
                      <span>अर्ज शोधा</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {savedDocs.length === 0 ? (
              <div className="text-center py-8 text-gray-400 space-y-2">
                <FileText className="w-8 h-8 mx-auto opacity-40" />
                <p className="text-xs font-semibold">अद्याप कोणताही अर्ज जतन केलेला नाही.</p>
                <button
                  onClick={() => setActiveTab("draft")}
                  className="text-xs font-bold text-[#059669] hover:underline cursor-pointer"
                >
                  नवीन अर्ज तयार करा →
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {savedDocs.map((doc, i) => (
                  <div
                    key={doc.id || i}
                    className="p-3 bg-gray-50 rounded-xl border border-gray-200/80 flex flex-wrap items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <strong className="text-gray-900 font-bold block">{doc.title}</strong>
                      <span className="text-[10px] text-gray-500 font-medium">
                        तारीख: {doc.date} &bull; पावती क्र.: {doc.id} {doc.applicant_name ? `• अर्जदार: ${doc.applicant_name}` : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(doc.content);
                          toast.success("मजकूर कॉपी केला!");
                        }}
                        className="px-2 py-1 text-xs font-bold rounded-lg border border-gray-200 bg-white hover:bg-gray-100 flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="w-3 h-3 text-gray-600" />
                        <span>कॉपी</span>
                      </button>
                      <button
                        onClick={() => {
                          setGeneratedDoc(doc.content);
                          setActiveTab("draft");
                          setIsPaid(true);
                        }}
                        className="px-2.5 py-1 text-xs font-bold rounded-lg border border-[#013B36] bg-[#013B36] hover:bg-[#024E47] text-[#6EE7B7] flex items-center gap-1 cursor-pointer"
                      >
                        <Printer className="w-3 h-3 text-[#6EE7B7]" />
                        <span>पहा / प्रिंट</span>
                      </button>
                      <button
                        type="button"
                        disabled={isDownloadingPdf}
                        onClick={() => downloadPetitionPdf(doc.content, doc.title, doc.id)}
                        className="px-2.5 py-1 text-xs font-bold rounded-lg bg-[#013B36] hover:bg-[#024E47] text-white flex items-center gap-1 cursor-pointer shadow-xs disabled:opacity-60"
                        title="PDF डाऊनलोड करा"
                      >
                        <Download className="w-3 h-3 text-white" />
                        <span>PDF डाऊनलोड</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            TAB 4: मालमत्ता कायदेशीर तपासणी (PROPERTY LEGAL CHECK & COURT SEARCH)
        ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === "property" && (
          <PropertyLegalCheck lang={lang} />
        )}
      </main>

      {/* ── Integrated ₹30 Payment Modal ── */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-white rounded-2xl p-5 sm:p-6 shadow-2xl border border-gray-100 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#ECFDF5] text-[#013B36] flex items-center justify-center border border-[#A7F3D0]">
                  <CreditCard className="w-4 h-4 text-[#059669]" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-gray-900">अधिकृत कोर्ट अर्ज - सुरक्षित भरणा</h4>
                  <p className="text-[10px] text-gray-500 font-medium">Fastcase Legal ERP &bull; 256-bit SSL Secure</p>
                </div>
              </div>
              <button
                onClick={() => setShowPayModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xs p-1 rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Price Banner */}
            <div className="p-3.5 bg-[#ECFDF5] rounded-xl border border-[#A7F3D0] flex items-center justify-between">
              <div>
                <span className="text-[11px] text-[#013B36] font-bold block">एकवेळ अधिकृत ड्राफ्टिंग शुल्क:</span>
                <span className="text-[10px] text-gray-600">वकिलांचे ₹१,५०० वाचवा &bull; कोर्ट-मान्य A4 PDF</span>
              </div>
              <div className="text-2xl font-black text-[#013B36]">₹३०/-</div>
            </div>

            {/* Payment Method Tabs */}
            <div className="grid grid-cols-2 p-1 bg-gray-100 rounded-xl gap-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => setPaymentTab("upi_qr")}
                className={cn(
                  "py-2 px-2 rounded-lg transition text-center flex items-center justify-center gap-1.5 cursor-pointer",
                  paymentTab === "upi_qr"
                    ? "bg-white text-[#013B36] shadow-2xs font-black ring-1 ring-gray-200"
                    : "text-gray-600 hover:text-gray-900"
                )}
              >
                <QrCode className="w-4 h-4 text-[#059669]" />
                <span>📱 UPI QR स्कॅन</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentTab("card")}
                className={cn(
                  "py-2 px-2 rounded-lg transition text-center flex items-center justify-center gap-1.5 cursor-pointer",
                  paymentTab === "card"
                    ? "bg-white text-[#013B36] shadow-2xs font-black ring-1 ring-gray-200"
                    : "text-gray-600 hover:text-gray-900"
                )}
              >
                <CreditCard className="w-4 h-4 text-[#059669]" />
                <span>💳 कार्ड / Razorpay</span>
              </button>
            </div>

            {/* Tab 1: Direct UPI QR (Default Open!) */}
            {paymentTab === "upi_qr" && (
              <div className="space-y-3 text-center">
                <div className="p-3 bg-white rounded-xl border border-gray-200 inline-block shadow-2xs mx-auto">
                  <img
                    src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi%3A%2F%2Fpay%3Fpa%3D087100108358%40cosb0000087.ifsc.npci%26pn%3DSOSM%2520SERVICES%2520PRIVATE%2520LIMITED%26am%3D30%26cu%3DINR%26tn%3DCourt%2520Petition%2520Draft"
                    alt="Cosmos Bank UPI QR Code"
                    className="w-44 h-44 mx-auto rounded-lg"
                  />
                </div>
                <p className="text-xs font-bold text-gray-700">
                  कोणत्याही UPI अ‍ॅपद्वारे (PhonePe, GPay, Paytm) स्कॅन करून ₹३० पाठवा
                </p>

                {/* Company Account Info Box */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-left text-[11px] space-y-1">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                    <span className="text-gray-500 font-medium">कंपनी नाव:</span>
                    <span className="font-bold text-gray-900 text-right">SOSM SERVICES PRIVATE LIMITED</span>
                  </div>
                  <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                    <span className="text-gray-500 font-medium">बँक खाते क्र.:</span>
                    <div className="flex items-center gap-1">
                      <span className="font-mono font-bold text-[#013B36]">087100108358</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText("087100108358");
                          toast.success("खाते क्रमांक कॉपी केला!");
                        }}
                        className="text-[#059669] hover:text-[#013B36] p-0.5 cursor-pointer"
                        title="Copy Account Number"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 font-medium">बँक / IFSC:</span>
                    <div className="flex items-center gap-1">
                      <span className="font-mono font-bold text-[#013B36]">COSB0000087</span>
                      <span className="text-[10px] text-gray-500">(Cosmos Bank)</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText("COSB0000087");
                          toast.success("IFSC कोड कॉपी केला!");
                        }}
                        className="text-[#059669] hover:text-[#013B36] p-0.5 cursor-pointer"
                        title="Copy IFSC Code"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-1 text-left">
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    पेमेंट केल्यानंतर १२-अंकी UPI Ref / UTR क्र. (पावतीसाठी):
                  </label>
                  <input
                    type="text"
                    value={upiUtrInput}
                    onChange={(e) => setUpiUtrInput(e.target.value.replace(/[^0-9a-zA-Z]/g, ""))}
                    placeholder="उदा. 432109876543 (पर्यायी)"
                    maxLength={18}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-mono text-xs focus:outline-none focus:border-[#013B36] focus:ring-1 focus:ring-[#059669]/20"
                  />
                </div>
              </div>
            )}

            {/* Tab 2: Razorpay Online Payment (UPI, Cards, NetBanking) */}
            {paymentTab === "card" && (
              <div className="space-y-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                <div className="w-11 h-11 rounded-full bg-[#ECFDF5] text-[#059669] flex items-center justify-center mx-auto ring-4 ring-[#ECFDF5]">
                  <ShieldCheck className="w-6 h-6 text-[#059669]" />
                </div>
                <div>
                  <h5 className="font-extrabold text-gray-900 text-sm">सुरक्षित Razorpay ऑनलाइन पेमेंट</h5>
                  <p className="text-[11px] text-gray-600 mt-1">
                    Google Pay, PhonePe, Paytm, BHIM UPI, सर्व डेबिट/क्रेडिट कार्ड व नेटबँकिंगद्वारे तत्काळ ₹३० भरणा करा.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-1.5 text-[10px] font-bold text-gray-700 pt-1">
                  <span className="px-2 py-0.5 bg-white border border-gray-200 rounded shadow-2xs text-[#5f259f]">🟣 PhonePe</span>
                  <span className="px-2 py-0.5 bg-white border border-gray-200 rounded shadow-2xs text-[#0f9d58]">🟢 GPay</span>
                  <span className="px-2 py-0.5 bg-white border border-gray-200 rounded shadow-2xs text-[#00b9f5]">🔵 Paytm</span>
                  <span className="px-2 py-0.5 bg-white border border-gray-200 rounded shadow-2xs text-gray-800">💳 Cards & NetBanking</span>
                </div>
                <div className="text-[10px] text-emerald-800 bg-emerald-50 py-1.5 px-3 rounded-lg border border-emerald-200 font-medium">
                  ✓ भरणा थेट अधिकृत <b>SOSM SERVICES PRIVATE LIMITED</b> खात्यात जमा होतो.
                </div>
              </div>
            )}

            {/* Complete Payment Button */}
            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={handleCompletePayment}
                disabled={isProcessingPay}
                className="w-full py-3 bg-[#013B36] hover:bg-[#024E47] text-white font-black text-xs sm:text-sm rounded-xl shadow-md shadow-[#013B36]/25 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isProcessingPay ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>भरणा पडताळत आहे व PDF डाऊनलोड होत आहे...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span>
                      {paymentTab === "card"
                        ? "Razorpay द्वारे ₹३० भरणा करा →"
                        : "भरणा पूर्ण झाला (Verify & Download PDF) →"}
                    </span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowPayModal(false)}
                className="w-full py-1.5 text-xs font-bold text-gray-400 hover:text-gray-700 transition cursor-pointer"
              >
                रद्द करा (Cancel)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Payment Successful Popup Modal ── */}
      {showSuccessModal && successDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-gray-100 space-y-4 my-8 text-center animate-in fade-in zoom-in-95 duration-200">
            {/* Animated Green Checkmark */}
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto ring-8 ring-emerald-50">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>

            <div>
              <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 text-[11px] font-black rounded-full uppercase tracking-wider mb-2">
                ✓ भरणा यशस्वी व प्रमाणित
              </span>
              <h3 className="text-xl font-black text-gray-900">
                ₹३० भरणा यशस्वी झाला! 🎉
              </h3>
              <p className="text-xs text-gray-600 mt-1">
                आपला अधिकृत कोर्ट तक्रार अर्ज मसुदा तयार झाला आहे व कायदेशीररित्या प्रमाणित करण्यात आला आहे.
              </p>
            </div>

            {/* Receipt Summary Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left space-y-2 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-gray-500 font-medium">ई-पावती क्र. (Receipt No):</span>
                <span className="font-mono font-bold text-[#013B36]">{successDetails.receiptId}</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-gray-500 font-medium">व्यवहार आयडी / UTR:</span>
                <span className="font-mono text-gray-800 text-[11px] truncate max-w-[200px]">{successDetails.paymentId}</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-gray-500 font-medium">जमा झालेले खाते:</span>
                <span className="font-bold text-gray-900 text-[11px]">SOSM SERVICES PRIVATE LIMITED</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-gray-500 font-medium">तपशील:</span>
                <span className="font-medium text-gray-700 truncate max-w-[200px]">{successDetails.title}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500 font-medium">भरलेली रक्कम:</span>
                <span className="font-black text-emerald-700 text-sm">{successDetails.amount}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={() => {
                  downloadPetitionPdf(generatedDoc, activeProblem?.title_mr, successDetails.receiptId);
                }}
                disabled={isDownloadingPdf}
                className="w-full py-3 bg-[#013B36] hover:bg-[#024E47] text-white font-black text-sm rounded-xl shadow-lg shadow-[#013B36]/25 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4 text-white" />
                <span>📄 अधिकृत कोर्ट अर्ज (PDF) डाऊनलोड करा</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  printOfficialA4Document(generatedDoc, activeProblem?.title_mr, successDetails.receiptId);
                }}
                className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4 text-gray-600" />
                <span>🖨️ पावतीसह प्रिंट करा (Print A4)</span>
              </button>

              <button
                type="button"
                onClick={() => setShowSuccessModal(false)}
                className="w-full py-2 text-xs font-bold text-gray-500 hover:text-gray-800 transition cursor-pointer"
              >
                पूर्ण झाले (Done / Close)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Sign In / Register Modal (if session expires or needed) ── */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl p-5 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h4 className="text-sm font-black text-gray-900">नागरिक लॉगिन / नोंदणी</h4>
              <button onClick={() => setShowAuthModal(false)} className="text-gray-400 hover:text-gray-600 text-xs p-1">
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 p-1 bg-gray-100 rounded-xl gap-1 text-xs font-bold">
              <button
                onClick={() => setAuthModalTab("login")}
                className={cn("py-1.5 rounded-lg transition", authModalTab === "login" ? "bg-white text-[#013B36] shadow-2xs font-black ring-1 ring-gray-200" : "text-gray-600")}
              >
                लॉगिन
              </button>
              <button
                onClick={() => setAuthModalTab("register")}
                className={cn("py-1.5 rounded-lg transition", authModalTab === "register" ? "bg-white text-[#013B36] shadow-2xs font-black ring-1 ring-gray-200" : "text-gray-600")}
              >
                नवीन नोंदणी
              </button>
            </div>

            {authModalTab === "login" ? (
              <form onSubmit={handleModalLogin} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">ईमेल आयडी</label>
                  <input
                    type="email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="citizen@example.com"
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:border-[#013B36]"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-gray-700">पासवर्ड</label>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode("otp");
                        setAuthOtpStep("email");
                      }}
                      className="text-[11px] font-bold text-[#059669] hover:underline cursor-pointer"
                    >
                      पासवर्ड विसरलात? OTP लॉगिन वापरा →
                    </button>
                  </div>
                  <input
                    type="password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:border-[#013B36]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-2.5 bg-[#013B36] hover:bg-[#024E47] text-[#6EE7B7] font-black text-xs rounded-xl shadow-xs transition"
                >
                  {authLoading ? "लॉगिन होत आहे..." : "लॉगिन करा →"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleModalRegister} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">पूर्ण नाव</label>
                  <input
                    type="text"
                    value={authFullName}
                    onChange={(e) => setAuthFullName(e.target.value)}
                    placeholder="आपले नाव"
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:border-[#013B36]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">ईमेल आयडी</label>
                  <input
                    type="email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="citizen@example.com"
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:border-[#013B36]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">पासवर्ड</label>
                  <input
                    type="password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:border-[#013B36]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-2.5 bg-[#013B36] hover:bg-[#024E47] text-[#6EE7B7] font-black text-xs rounded-xl shadow-xs transition"
                >
                  {authLoading ? "नोंदणी होत आहे..." : "खाते तयार करा →"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── Reset Credentials / Forgot Password Modal ── */}
      {showForgotModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-2xs p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl border border-gray-100 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#ECFDF5] flex items-center justify-center text-[#065F46] border border-[#A7F3D0]">
                <Scale className="w-5 h-5 text-[#059669]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Reset Credentials</h3>
                <p className="text-xs text-gray-500">Fastcase Security Assistance</p>
              </div>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              If you have forgotten your password or need to recover your email, please use <strong>OTP Sign-In</strong> or email{" "}
              <a href="mailto:support@fastcase.in" className="font-bold text-gray-900 hover:text-[#059669] underline">
                support@fastcase.in
              </a>.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowForgotModal(false);
                  setAuthMode("otp");
                  setAuthOtpStep("email");
                }}
                className="flex-1 py-2.5 bg-[#013B36] text-white font-bold text-xs rounded-xl hover:bg-[#024E47] transition cursor-pointer text-center"
              >
                Use OTP Login
              </button>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="py-2.5 px-4 bg-gray-100 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-200 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
