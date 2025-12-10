"use client";

import { useFhevm } from "../fhevm/useFhevm";
import { useInMemoryStorage } from "../hooks/useInMemoryStorage";
import { useMetaMaskEthersSigner } from "../hooks/metamask/useMetaMaskEthersSigner";
import { useSilentOur } from "@/hooks/useSilentOur";
import { useState } from "react";

export const SilentOurDemo = () => {
  const { storage: fhevmDecryptionSignatureStorage } = useInMemoryStorage();
  const {
    provider,
    chainId,
    accounts,
    isConnected,
    connect,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
    initialMockChains,
  } = useMetaMaskEthersSigner();

  // FHEVM instance
  const {
    instance: fhevmInstance,
    status: fhevmStatus,
    error: fhevmError,
  } = useFhevm({
    provider,
    chainId,
    initialMockChains,
    enabled: true,
  });

  // SilentOur hook
  const silentOur = useSilentOur({
    instance: fhevmInstance,
    fhevmDecryptionSignatureStorage,
    eip1193Provider: provider,
    chainId,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
  });

  // UI state
  const [activeTab, setActiveTab] = useState<"tracking" | "query">("tracking");
  const [minutesInput, setMinutesInput] = useState<string>("");
  const [viewerAddressInput, setViewerAddressInput] = useState<string>("");
  const [selectedPeriod, setSelectedPeriod] = useState<"week" | "month" | "year" | "all">("week");
  const [checkAccessInput, setCheckAccessInput] = useState<string>("");
  const [checkAccessResult, setCheckAccessResult] = useState<boolean | null>(null);
  const [userInfoInput, setUserInfoInput] = useState<string>("");
  const [userInfoResult, setUserInfoResult] = useState<{
    address: string;
    recordCount: number;
    hasRecords: boolean;
  } | null>(null);

  const getStatusColor = (status: string) => {
    if (status === "ready" || status === "completed") return "text-green-700";
    if (status === "loading" || status === "initializing") return "text-orange-700";
    return "text-gray-700";
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#f8f9fa" }}>
        <div className="text-center max-w-xl px-8">
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4" style={{ backgroundColor: "#1976d2" }}>
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-5xl font-bold mb-4" style={{ color: "#1a1a1a" }}>SilentOur</h1>
            <p className="text-xl mb-8" style={{ color: "#666666" }}>
              Privacy-Preserving Offline Time Tracker
            </p>
            <p className="text-base mb-8" style={{ color: "#666666" }}>
              Track your offline time with encrypted data using FHEVM technology
            </p>
          </div>
          <button
            onClick={connect}
            className="px-8 py-4 rounded-lg font-semibold text-white text-lg transition-all duration-200 hover:shadow-lg"
            style={{ backgroundColor: "#1976d2" }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1565c0")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#1976d2")}
          >
            Connect MetaMask
          </button>
        </div>
      </div>
    );
  }

  // Only show deployment error when chainId is defined and contract is not deployed
  if (chainId !== undefined && silentOur.isDeployed === false) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#f8f9fa" }}>
        <div className="max-w-2xl mx-auto px-8">
          <div className="rounded-lg p-8" style={{ backgroundColor: "#fff3e0", border: "2px solid #ed6c02" }}>
            <div className="flex items-start gap-4">
              <svg className="w-8 h-8 flex-shrink-0" style={{ color: "#ed6c02" }} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <h2 className="text-xl font-bold mb-2" style={{ color: "#1a1a1a" }}>Contract Not Deployed</h2>
                <p style={{ color: "#666666" }}>
                  The SilentOur contract is not deployed on the current network (Chain ID: {chainId}). 
                  Please deploy the contract first or switch to a supported network.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4" style={{ backgroundColor: "#f8f9fa" }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ backgroundColor: "#1976d2" }}>
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold mb-3" style={{ color: "#1a1a1a" }}>SilentOur</h1>
          <p className="text-lg" style={{ color: "#666666" }}>
            Privacy-Preserving Offline Time Tracker
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex rounded-lg p-1" style={{ backgroundColor: "#ffffff", border: "1px solid #e0e0e0" }}>
            <button
              onClick={() => setActiveTab("tracking")}
              className="px-6 py-3 rounded-lg font-semibold transition-all duration-200"
              style={{
                backgroundColor: activeTab === "tracking" ? "#1976d2" : "transparent",
                color: activeTab === "tracking" ? "#ffffff" : "#666666"
              }}
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Time Tracking
              </div>
            </button>
            <button
              onClick={() => setActiveTab("query")}
              className="px-6 py-3 rounded-lg font-semibold transition-all duration-200"
              style={{
                backgroundColor: activeTab === "query" ? "#1976d2" : "transparent",
                color: activeTab === "query" ? "#ffffff" : "#666666"
              }}
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Query & Check
              </div>
            </button>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="rounded-lg p-6" style={{ backgroundColor: "#ffffff", border: "1px solid #e0e0e0" }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#e3f2fd" }}>
                <svg className="w-6 h-6" style={{ color: "#1976d2" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold" style={{ color: "#1a1a1a" }}>Network</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span style={{ color: "#666666" }}>Chain ID:</span>
                <span className="font-mono font-semibold" style={{ color: "#1a1a1a" }}>{chainId || "Unknown"}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: "#666666" }}>Account:</span>
                <span className="font-mono font-semibold truncate ml-2" style={{ color: "#1a1a1a" }} title={accounts?.[0] || "No account"}>
                  {accounts?.[0] ? `${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}` : "No account"}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-lg p-6" style={{ backgroundColor: "#ffffff", border: "1px solid #e0e0e0" }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#e8f5e9" }}>
                <svg className="w-6 h-6" style={{ color: "#2e7d32" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold" style={{ color: "#1a1a1a" }}>FHEVM</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span style={{ color: "#666666" }}>Status:</span>
                <span className={`font-semibold ${getStatusColor(fhevmStatus)}`}>{fhevmStatus}</span>
              </div>
              {fhevmError && (
                <div className="mt-2 p-2 rounded" style={{ backgroundColor: "#ffebee" }}>
                  <p className="text-xs" style={{ color: "#c62828" }}>{fhevmError.message}</p>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg p-6" style={{ backgroundColor: "#ffffff", border: "1px solid #e0e0e0" }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#f3e5f5" }}>
                <svg className="w-6 h-6" style={{ color: "#7b1fa2" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold" style={{ color: "#1a1a1a" }}>Records</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span style={{ color: "#666666" }}>Total Count:</span>
                <span className="text-2xl font-bold" style={{ color: "#1a1a1a" }}>
                  {silentOur.recordCount ?? "—"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Time Tracking Tab */}
        {activeTab === "tracking" && (
          <div className="space-y-8">
            {/* Add Record Section */}
            <div className="rounded-lg p-8" style={{ backgroundColor: "#ffffff", border: "1px solid #e0e0e0" }}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#e3f2fd" }}>
                  <svg className="w-6 h-6" style={{ color: "#1976d2" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold" style={{ color: "#1a1a1a" }}>Add Time Record</h2>
              </div>
              <p className="mb-6" style={{ color: "#666666" }}>
                Record your offline time in minutes. The data will be encrypted and stored securely on-chain.
              </p>
              <div className="flex gap-4">
                <input
                  type="number"
                  placeholder="Enter minutes (e.g., 120)"
                  value={minutesInput}
                  onChange={(e) => setMinutesInput(e.target.value)}
                  min="1"
                  className="flex-1 px-4 py-3 rounded-lg text-base transition-all"
                  style={{ 
                    backgroundColor: "#ffffff", 
                    border: "2px solid #e0e0e0", 
                    color: "#1a1a1a",
                    outline: "none"
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#1976d2")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#e0e0e0")}
                />
                <button
                  disabled={!silentOur.canAddRecord || !minutesInput}
                  onClick={() => {
                    const minutes = parseInt(minutesInput);
                    if (minutes > 0) {
                      silentOur.addOfflineRecord(minutes);
                      setMinutesInput("");
                    }
                  }}
                  className="px-8 py-3 rounded-lg font-semibold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: "#2e7d32" }}
                  onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = "#1b5e20")}
                  onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = "#2e7d32")}
                >
                  {silentOur.isAddingRecord ? "Adding..." : "Add Record"}
                </button>
              </div>
            </div>

            {/* Statistics Section */}
            <div className="rounded-lg p-8" style={{ backgroundColor: "#ffffff", border: "1px solid #e0e0e0" }}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#f3e5f5" }}>
                  <svg className="w-6 h-6" style={{ color: "#7b1fa2" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold" style={{ color: "#1a1a1a" }}>Statistics</h2>
              </div>
              
              <div className="flex flex-wrap gap-4 mb-6">
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value as "week" | "month" | "year" | "all")}
                  className="px-4 py-3 rounded-lg transition-all flex-1 min-w-[200px]"
                  style={{ 
                    backgroundColor: "#ffffff", 
                    border: "2px solid #e0e0e0", 
                    color: "#1a1a1a",
                    outline: "none"
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#1976d2")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#e0e0e0")}
                >
                  <option value="week">Past Week</option>
                  <option value="month">Past Month</option>
                  <option value="year">Past Year</option>
                  <option value="all">All Time</option>
                </select>
                <button
                  disabled={silentOur.isFetchingStats}
                  onClick={() => silentOur.getEncryptedStats(selectedPeriod)}
                  className="px-6 py-3 rounded-lg font-semibold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: "#1976d2" }}
                  onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = "#1565c0")}
                  onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = "#1976d2")}
                >
                  {silentOur.isFetchingStats ? "Loading..." : "Fetch Stats"}
                </button>
                <button
                  disabled={!silentOur.canDecrypt || silentOur.isDecrypting}
                  onClick={silentOur.decryptStats}
                  className="px-6 py-3 rounded-lg font-semibold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: "#7b1fa2" }}
                  onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = "#6a1b9a")}
                  onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = "#7b1fa2")}
                >
                  {silentOur.isDecrypting ? "Decrypting..." : "Decrypt"}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Total Time", value: silentOur.totalClear, icon: "⏱️" },
                  { label: "Average", value: silentOur.averageClear, icon: "📊" },
                  { label: "Maximum", value: silentOur.maxClear, icon: "⬆️" },
                  { label: "Best Record", value: silentOur.bestRecordClear, icon: "🏆" }
                ].map((stat, idx) => (
                  <div key={idx} className="p-6 rounded-lg" style={{ backgroundColor: "#f8f9fa", border: "1px solid #e0e0e0" }}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl">{stat.icon}</span>
                      <p className="text-sm font-medium" style={{ color: "#666666" }}>{stat.label}</p>
                    </div>
                    <p className="text-3xl font-bold" style={{ color: "#1a1a1a" }}>
                      {stat.value !== undefined ? `${Number(stat.value)}` : "—"}
                    </p>
                    {stat.value !== undefined && (
                      <p className="text-sm mt-1" style={{ color: "#666666" }}>minutes</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Access Control Section */}
            <div className="rounded-lg p-8" style={{ backgroundColor: "#ffffff", border: "1px solid #e0e0e0" }}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#e8f5e9" }}>
                  <svg className="w-6 h-6" style={{ color: "#2e7d32" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold" style={{ color: "#1a1a1a" }}>Access Control</h2>
              </div>
              <p className="mb-6" style={{ color: "#666666" }}>
                Manage who can view your encrypted statistics
              </p>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Enter viewer address (0x...)"
                  value={viewerAddressInput}
                  onChange={(e) => setViewerAddressInput(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg transition-all"
                  style={{ 
                    backgroundColor: "#ffffff", 
                    border: "2px solid #e0e0e0", 
                    color: "#1a1a1a",
                    outline: "none"
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#1976d2")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#e0e0e0")}
                />
                <div className="flex gap-3">
                  <button
                    disabled={!viewerAddressInput}
                    onClick={() => {
                      silentOur.grantAccess(viewerAddressInput);
                      setViewerAddressInput("");
                    }}
                    className="flex-1 px-4 py-3 rounded-lg font-semibold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: "#2e7d32" }}
                    onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = "#1b5e20")}
                    onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = "#2e7d32")}
                  >
                    Grant Access
                  </button>
                  <button
                    disabled={!viewerAddressInput}
                    onClick={() => {
                      silentOur.revokeAccess(viewerAddressInput);
                      setViewerAddressInput("");
                    }}
                    className="flex-1 px-4 py-3 rounded-lg font-semibold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: "#c62828" }}
                    onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = "#b71c1c")}
                    onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = "#c62828")}
                  >
                    Revoke Access
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Query & Check Tab */}
        {activeTab === "query" && (
          <div className="space-y-8">
            {/* Check Permission Section */}
            <div className="rounded-lg p-8" style={{ backgroundColor: "#ffffff", border: "1px solid #e0e0e0" }}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#fff3e0" }}>
                  <svg className="w-6 h-6" style={{ color: "#ed6c02" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold" style={{ color: "#1a1a1a" }}>Check Permission</h2>
              </div>
              <p className="mb-6" style={{ color: "#666666" }}>
                Verify if you have access to view someone's data
              </p>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Enter user address (0x...)"
                  value={checkAccessInput}
                  onChange={(e) => setCheckAccessInput(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg transition-all"
                  style={{ 
                    backgroundColor: "#ffffff", 
                    border: "2px solid #e0e0e0", 
                    color: "#1a1a1a",
                    outline: "none"
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#1976d2")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#e0e0e0")}
                />
                <button
                  disabled={!checkAccessInput}
                  onClick={async () => {
                    const hasPermission = await silentOur.checkAccessPermission(checkAccessInput);
                    setCheckAccessResult(hasPermission);
                  }}
                  className="w-full px-4 py-3 rounded-lg font-semibold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: "#1976d2" }}
                  onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = "#1565c0")}
                  onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = "#1976d2")}
                >
                  Check Permission
                </button>
                {checkAccessResult !== null && (
                  <div className={`p-4 rounded-lg flex items-center gap-3`} style={{ 
                    backgroundColor: checkAccessResult ? "#e8f5e9" : "#ffebee",
                    border: `1px solid ${checkAccessResult ? "#2e7d32" : "#c62828"}`
                  }}>
                    <svg className="w-6 h-6 flex-shrink-0" style={{ color: checkAccessResult ? "#2e7d32" : "#c62828" }} fill="currentColor" viewBox="0 0 20 20">
                      {checkAccessResult ? (
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      ) : (
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      )}
                    </svg>
                    <span className="font-semibold" style={{ color: checkAccessResult ? "#2e7d32" : "#c62828" }}>
                      {checkAccessResult ? "Access Granted" : "Access Denied"}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* User Info Section */}
            <div className="rounded-lg p-8" style={{ backgroundColor: "#ffffff", border: "1px solid #e0e0e0" }}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#e3f2fd" }}>
                  <svg className="w-6 h-6" style={{ color: "#1976d2" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold" style={{ color: "#1a1a1a" }}>User Information</h2>
              </div>
              <p className="mb-6" style={{ color: "#666666" }}>
                Query public information about any user
              </p>
              <div className="flex gap-4 mb-6">
                <input
                  type="text"
                  placeholder="Enter user address (0x...)"
                  value={userInfoInput}
                  onChange={(e) => setUserInfoInput(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-lg transition-all"
                  style={{ 
                    backgroundColor: "#ffffff", 
                    border: "2px solid #e0e0e0", 
                    color: "#1a1a1a",
                    outline: "none"
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#1976d2")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#e0e0e0")}
                />
                <button
                  disabled={!userInfoInput}
                  onClick={async () => {
                    const info = await silentOur.getUserInfo(userInfoInput);
                    setUserInfoResult(info);
                  }}
                  className="px-8 py-3 rounded-lg font-semibold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: "#1976d2" }}
                  onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = "#1565c0")}
                  onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = "#1976d2")}
                >
                  Query
                </button>
              </div>
              {userInfoResult && (
                <div className="p-6 rounded-lg" style={{ backgroundColor: "#f8f9fa", border: "1px solid #e0e0e0" }}>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-medium" style={{ color: "#666666" }}>Address:</span>
                      <span className="font-mono text-sm" style={{ color: "#1a1a1a" }}>
                        {`${userInfoResult.address.slice(0, 10)}...${userInfoResult.address.slice(-8)}`}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium" style={{ color: "#666666" }}>Record Count:</span>
                      <span className="text-xl font-bold" style={{ color: "#1a1a1a" }}>{userInfoResult.recordCount}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium" style={{ color: "#666666" }}>Has Records:</span>
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold`} style={{ 
                        backgroundColor: userInfoResult.hasRecords ? "#e8f5e9" : "#ffebee",
                        color: userInfoResult.hasRecords ? "#2e7d32" : "#c62828"
                      }}>
                        {userInfoResult.hasRecords ? "Yes" : "No"}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Message Display */}
        {silentOur.message && (
          <div className="rounded-lg p-6 flex items-start gap-4" style={{ backgroundColor: "#e3f2fd", border: "1px solid #1976d2" }}>
            <svg className="w-6 h-6 flex-shrink-0 mt-0.5" style={{ color: "#1976d2" }} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <p className="flex-1" style={{ color: "#1976d2", fontWeight: "500" }}>{silentOur.message}</p>
          </div>
        )}
      </div>
    </div>
  );
};

