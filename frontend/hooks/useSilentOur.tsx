"use client";

import { ethers } from "ethers";
import {
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { FhevmInstance } from "@/fhevm/fhevmTypes";
import { FhevmDecryptionSignature } from "@/fhevm/FhevmDecryptionSignature";
import { GenericStringStorage } from "@/fhevm/GenericStringStorage";

import { SilentOurAddresses } from "@/abi/SilentOurAddresses";
import { SilentOurABI } from "@/abi/SilentOurABI";

export type ClearValueType = {
  handle: string;
  clear: string | bigint | boolean;
};

type SilentOurInfoType = {
  abi: typeof SilentOurABI.abi;
  address?: `0x${string}`;
  chainId?: number;
  chainName?: string;
};

type AddressEntry = {
  address: string;
  chainId: number;
  chainName?: string;
};

function isAddressEntry(value: unknown): value is AddressEntry {
  return (
    typeof value === "object" &&
    value !== null &&
    "address" in value &&
    typeof (value as AddressEntry).address === "string" &&
    "chainId" in value &&
    typeof (value as AddressEntry).chainId === "number"
  );
}

function getSilentOurByChainId(
  chainId: number | undefined
): SilentOurInfoType {
  if (!chainId) {
    return { abi: SilentOurABI.abi };
  }

  const chainIdKey = chainId.toString() as keyof typeof SilentOurAddresses;
  const entry: unknown = SilentOurAddresses[chainIdKey];

  if (!isAddressEntry(entry)) {
    return { abi: SilentOurABI.abi, chainId };
  }

  if (entry.address === ethers.ZeroAddress) {
    return { abi: SilentOurABI.abi, chainId };
  }

  return {
    address: entry.address as `0x${string}` | undefined,
    chainId: entry.chainId ?? chainId,
    chainName: entry.chainName,
    abi: SilentOurABI.abi,
  };
}

/**
 * Normalize handle value to ensure it's a valid hex string format
 * Contract returned euint32 (bytes32) may be returned in different formats (BigInt, string, etc.)
 * This function ensures conversion to a standard 0x-prefixed hex string (32 bytes = 64 hex characters + 0x prefix)
 */
function normalizeHandle(handle: unknown): string | undefined {
  // Debug info
  console.log("[normalizeHandle] Input:", { handle, type: typeof handle });
  
  if (!handle) {
    console.log("[normalizeHandle] Handle is falsy, returning undefined");
    return undefined;
  }

  // If already a string format
  if (typeof handle === "string") {
    // Check if it's zero hash
    if (handle === ethers.ZeroHash || handle === "0x0" || handle === "0x" || handle === "0x00") {
      console.log("[normalizeHandle] Handle is zero hash, returning undefined");
      return undefined;
    }
    
    // If already a valid hex string starting with 0x
    if (handle.startsWith("0x")) {
      // Verify if it's a valid hex string
      if (ethers.isHexString(handle)) {
        // Ensure it's 32 bytes (64 hex characters)
        const hexWithoutPrefix = handle.slice(2);
        if (hexWithoutPrefix.length <= 64) {
          // Pad to 64 characters (left pad with 0)
          const paddedHex = hexWithoutPrefix.padStart(64, "0");
          const normalized = "0x" + paddedHex;
          if (normalized === ethers.ZeroHash) {
            console.log("[normalizeHandle] Normalized to zero hash, returning undefined");
            return undefined;
          }
          console.log("[normalizeHandle] Normalized string:", normalized);
          return normalized;
        }
        // If longer than 64 characters, truncate to last 64 characters
        if (hexWithoutPrefix.length > 64) {
          const truncated = "0x" + hexWithoutPrefix.slice(-64);
          if (truncated === ethers.ZeroHash) {
            console.log("[normalizeHandle] Truncated to zero hash, returning undefined");
            return undefined;
          }
          console.log("[normalizeHandle] Truncated string:", truncated);
          return truncated;
        }
      }
      console.log("[normalizeHandle] Invalid hex string, returning undefined");
      return undefined;
    }
    
    // If not starting with 0x, try to parse
    try {
      // Try parsing as BigInt (preferred, as bytes32 is usually a large number)
      const bigInt = BigInt(handle);
      const hexString = ethers.toBeHex(bigInt, 32);
      if (hexString === ethers.ZeroHash) {
        console.log("[normalizeHandle] BigInt converted to zero hash, returning undefined");
        return undefined;
      }
      console.log("[normalizeHandle] Converted from BigInt string:", hexString);
      return hexString;
    } catch {
      // If BigInt parsing fails, try as number
      try {
        const num = Number(handle);
        if (!isNaN(num)) {
          const hexString = ethers.toBeHex(num, 32);
          if (hexString === ethers.ZeroHash) {
            console.log("[normalizeHandle] Number converted to zero hash, returning undefined");
            return undefined;
          }
          console.log("[normalizeHandle] Converted from number:", hexString);
          return hexString;
        }
      } catch {
        console.log("[normalizeHandle] Failed to parse string, returning undefined");
        return undefined;
      }
    }
  }

  // If BigInt type
  if (typeof handle === "bigint") {
    try {
      const hexString = ethers.toBeHex(handle, 32);
      if (hexString === ethers.ZeroHash) {
        console.log("[normalizeHandle] BigInt is zero hash, returning undefined");
        return undefined;
      }
      console.log("[normalizeHandle] Converted from BigInt:", hexString);
      return hexString;
    } catch (e) {
      console.log("[normalizeHandle] Failed to convert BigInt:", e);
      return undefined;
    }
  }

  // If number type
  if (typeof handle === "number") {
    try {
      const hexString = ethers.toBeHex(handle, 32);
      if (hexString === ethers.ZeroHash) {
        console.log("[normalizeHandle] Number is zero hash, returning undefined");
        return undefined;
      }
      console.log("[normalizeHandle] Converted from number:", hexString);
      return hexString;
    } catch (e) {
      console.log("[normalizeHandle] Failed to convert number:", e);
      return undefined;
    }
  }

  // If Uint8Array
  if (handle instanceof Uint8Array) {
    try {
      const hexString = ethers.hexlify(handle);
      // Ensure it's 32 bytes
      if (hexString.length === 66) { // 0x + 64 characters
        if (hexString === ethers.ZeroHash) {
          console.log("[normalizeHandle] Uint8Array is zero hash, returning undefined");
          return undefined;
        }
        console.log("[normalizeHandle] Converted from Uint8Array:", hexString);
        return hexString;
      }
      // If not 32 bytes, try to convert
      if (handle.length <= 32) {
        const padded = new Uint8Array(32);
        padded.set(handle, 32 - handle.length);
        const hexString = ethers.hexlify(padded);
        if (hexString === ethers.ZeroHash) {
          console.log("[normalizeHandle] Padded Uint8Array is zero hash, returning undefined");
          return undefined;
        }
        console.log("[normalizeHandle] Padded Uint8Array:", hexString);
        return hexString;
      }
      console.log("[normalizeHandle] Uint8Array too long, returning undefined");
      return undefined;
    } catch (e) {
      console.log("[normalizeHandle] Failed to convert Uint8Array:", e);
      return undefined;
    }
  }

  // Try using ethers hexlify to convert
  try {
    const hexString = ethers.hexlify(handle);
    // Ensure it's 32 bytes format
    if (hexString.length === 66) {
      if (hexString === ethers.ZeroHash) {
        console.log("[normalizeHandle] hexlify result is zero hash, returning undefined");
        return undefined;
      }
      console.log("[normalizeHandle] Converted via hexlify:", hexString);
      return hexString;
    }
    // If not 32 bytes, try to normalize
    if (hexString.startsWith("0x")) {
      const hexWithoutPrefix = hexString.slice(2);
      if (hexWithoutPrefix.length <= 64) {
        const paddedHex = hexWithoutPrefix.padStart(64, "0");
        const normalized = "0x" + paddedHex;
        if (normalized === ethers.ZeroHash) {
          console.log("[normalizeHandle] Normalized hexlify result is zero hash, returning undefined");
          return undefined;
        }
        console.log("[normalizeHandle] Normalized hexlify result:", normalized);
        return normalized;
      }
    }
    console.log("[normalizeHandle] hexlify result invalid, returning undefined");
    return undefined;
  } catch (e) {
    console.log("[normalizeHandle] hexlify failed:", e);
    return undefined;
  }
}

export const useSilentOur = (parameters: {
  instance: FhevmInstance | undefined;
  fhevmDecryptionSignatureStorage: GenericStringStorage;
  eip1193Provider: ethers.Eip1193Provider | undefined;
  chainId: number | undefined;
  ethersSigner: ethers.JsonRpcSigner | undefined;
  ethersReadonlyProvider: ethers.ContractRunner | undefined;
  sameChain: RefObject<(chainId: number | undefined) => boolean>;
  sameSigner: RefObject<
    (ethersSigner: ethers.JsonRpcSigner | undefined) => boolean
  >;
}) => {
  const {
    instance,
    fhevmDecryptionSignatureStorage,
    chainId,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
  } = parameters;

  // States
  const [recordCount, setRecordCount] = useState<number | undefined>(undefined);
  const [isAddingRecord, setIsAddingRecord] = useState<boolean>(false);
  const [isFetchingStats, setIsFetchingStats] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");

  // Stats results
  const [totalHandle, setTotalHandle] = useState<string | undefined>(undefined);
  const [averageHandle, setAverageHandle] = useState<string | undefined>(undefined);
  const [maxHandle, setMaxHandle] = useState<string | undefined>(undefined);
  const [bestRecordHandle, setBestRecordHandle] = useState<string | undefined>(undefined);
  
  const [totalClear, setTotalClear] = useState<ClearValueType | undefined>(undefined);
  const [averageClear, setAverageClear] = useState<ClearValueType | undefined>(undefined);
  const [maxClear, setMaxClear] = useState<ClearValueType | undefined>(undefined);
  const [bestRecordClear, setBestRecordClear] = useState<ClearValueType | undefined>(undefined);

  const [isDecrypting, setIsDecrypting] = useState<boolean>(false);

  const silentOurRef = useRef<SilentOurInfoType | undefined>(undefined);
  const isAddingRecordRef = useRef<boolean>(false);
  const isFetchingStatsRef = useRef<boolean>(false);
  const isDecryptingRef = useRef<boolean>(false);

  // Contract info
  const silentOur = useMemo(() => {
    const c = getSilentOurByChainId(chainId);
    silentOurRef.current = c;
    // Only show message when chainId is defined (not undefined) and no address is configured
    // When chainId is undefined or address exists, clear deployment error message
    if (chainId !== undefined && !c.address) {
      setMessage(`Contract not deployed on this network. Please deploy or switch networks.`);
    } else {
      // Clear deployment error message when chainId is undefined or address is configured
      setMessage((prev) => {
        if (prev.includes("not deployed")) {
          return "";
        }
        return prev;
      });
    }
    return c;
  }, [chainId]);

  const isDeployed = useMemo(() => {
    if (!silentOur) {
      return undefined;
    }
    return Boolean(silentOur.address) && silentOur.address !== ethers.ZeroAddress;
  }, [silentOur]);

  // Get record count
  const canGetRecordCount = useMemo(() => {
    return silentOur.address && ethersReadonlyProvider && !isFetchingStats;
  }, [silentOur.address, ethersReadonlyProvider, isFetchingStats]);

  const refreshRecordCount = useCallback(() => {
    if (isFetchingStatsRef.current) {
      return;
    }

    if (
      !silentOurRef.current ||
      !silentOurRef.current?.chainId ||
      !silentOurRef.current?.address ||
      !ethersReadonlyProvider ||
      !ethersSigner
    ) {
      setRecordCount(undefined);
      return;
    }

    isFetchingStatsRef.current = true;
    setIsFetchingStats(true);

    const thisChainId = silentOurRef.current.chainId;
    const thisSilentOurAddress = silentOurRef.current.address;
    const thisEthersSigner = ethersSigner;

    const thisSilentOurContract = new ethers.Contract(
      thisSilentOurAddress,
      silentOurRef.current.abi,
      ethersReadonlyProvider
    );

    thisSilentOurContract
      .getRecordCount(thisEthersSigner.address)
      .then((value: bigint) => {
        console.log("[useSilentOur] getRecordCount()=" + value);
        if (
          sameChain.current(thisChainId) &&
          thisSilentOurAddress === silentOurRef.current?.address
        ) {
          setRecordCount(Number(value));
        }

        isFetchingStatsRef.current = false;
        setIsFetchingStats(false);
      })
      .catch((e: unknown) => {
        console.error("[useSilentOur] getRecordCount failed:", e);
        setMessage("Failed to retrieve record count. Please try again.");
        isFetchingStatsRef.current = false;
        setIsFetchingStats(false);
      });
  }, [ethersReadonlyProvider, ethersSigner, sameChain]);

  // Auto refresh record count
  useEffect(() => {
    if (isDeployed && ethersSigner) {
      refreshRecordCount();
    }
  }, [isDeployed, ethersSigner, refreshRecordCount]);

  // Add offline record
  const canAddRecord = useMemo(() => {
    return (
      silentOur.address &&
      instance &&
      ethersSigner &&
      !isAddingRecord &&
      !isFetchingStats
    );
  }, [silentOur.address, instance, ethersSigner, isAddingRecord, isFetchingStats]);

  const addOfflineRecord = useCallback(
    (minutes: number) => {
      if (isAddingRecordRef.current || isFetchingStatsRef.current) {
        return;
      }

      if (!silentOur.address || !instance || !ethersSigner || minutes <= 0) {
        return;
      }

      const thisChainId = chainId;
      const thisSilentOurAddress = silentOur.address;
      const thisEthersSigner = ethersSigner;
      const thisSilentOurContract = new ethers.Contract(
        thisSilentOurAddress,
        silentOur.abi,
        thisEthersSigner
      );

      isAddingRecordRef.current = true;
      setIsAddingRecord(true);
      setMessage(`Preparing to add ${minutes} minutes to your records...`);

      const run = async () => {
        // Let the browser repaint before running 'input.encrypt()' (CPU-costly)
        await new Promise((resolve) => setTimeout(resolve, 100));

        const isStale = () =>
          thisSilentOurAddress !== silentOurRef.current?.address ||
          !sameChain.current(thisChainId) ||
          !sameSigner.current(thisEthersSigner);

        try {
          const input = instance.createEncryptedInput(
            thisSilentOurAddress,
            thisEthersSigner.address
          );
          input.add32(minutes);

          // CPU-intensive (browser may freeze a little when FHE-WASM modules are loading)
          const enc = await input.encrypt();

          if (isStale()) {
            setMessage(`Operation cancelled due to network change`);
            return;
          }

          setMessage(`Encrypting your data...`);

          // Call contract
          const tx: ethers.TransactionResponse =
            await thisSilentOurContract.addOfflineRecord(
              enc.handles[0],
              enc.inputProof
            );

          setMessage(`Waiting for transaction confirmation...`);

          const receipt = await tx.wait();

          if (receipt?.status === 1) {
            setMessage(`Record added successfully!`);
          } else {
            setMessage(`Transaction failed. Please try again.`);
          }

          if (isStale()) {
            setMessage(`Operation cancelled due to network change`);
            return;
          }

          refreshRecordCount();
        } catch (e) {
          console.error("[useSilentOur] addOfflineRecord failed:", e);
          const errorMsg = e instanceof Error ? e.message : String(e);
          if (errorMsg.includes("user rejected")) {
            setMessage(`Transaction cancelled by user`);
          } else {
            setMessage(`Failed to add record. Please try again.`);
          }
        } finally {
          isAddingRecordRef.current = false;
          setIsAddingRecord(false);
        }
      };

      run();
    },
    [
      ethersSigner,
      silentOur.address,
      silentOur.abi,
      instance,
      chainId,
      refreshRecordCount,
      sameChain,
      sameSigner,
    ]
  );

  // Get encrypted stats
  const getEncryptedStats = useCallback(
    async (period: "week" | "month" | "year" | "all") => {
      if (isFetchingStatsRef.current) {
        return;
      }

      // Only check necessary conditions: getEncryptedStats depends on msg.sender for permission check, must use signer
      if (!silentOur.address || !ethersSigner) {
        return;
      }

      isFetchingStatsRef.current = true;
      setIsFetchingStats(true);
      
      const periodNames = {
        week: "past week",
        month: "past month",
        year: "past year",
        all: "all time"
      };
      setMessage(`Fetching statistics for ${periodNames[period]}...`);

      const thisChainId = chainId;
      const thisSilentOurAddress = silentOur.address;
      const thisEthersSigner = ethersSigner;

      // Use signer to call, because getEncryptedStats depends on msg.sender to check permissions
      // Although the function is not view, it needs to set FHE ACL permissions, so it requires a transaction
      const thisSilentOurContract = new ethers.Contract(
        thisSilentOurAddress,
        silentOur.abi,
        thisEthersSigner
      );

      try {
        const now = Math.floor(Date.now() / 1000);
        let startTime = 0;
        const endTime = now;

        if (period === "week") {
          startTime = now - 7 * 24 * 60 * 60;
        } else if (period === "month") {
          startTime = now - 30 * 24 * 60 * 60;
        } else if (period === "year") {
          startTime = now - 365 * 24 * 60 * 60;
        }

        // Call the new combined function, only one transaction needed to get all statistics
        // Since getEncryptedStats is a nonpayable function, it returns a transaction response
        // We need to wait for transaction confirmation, then use staticCall to get the return value
        const tx = await thisSilentOurContract.getEncryptedStats(
          thisEthersSigner.address,
          startTime,
          endTime
        );
        
        setMessage(`Waiting for transaction confirmation...`);
        
        // Wait for transaction confirmation
        await tx.wait();
        
        setMessage(`Retrieving encrypted data...`);
        
        // After transaction confirmation, use staticCall to get return value (ACL is already set at this point)
        const result = await thisSilentOurContract.getEncryptedStats.staticCall(
          thisEthersSigner.address,
          startTime,
          endTime
        );
        
        // Debug: view raw return value
        console.log("[useSilentOur] Raw result from getEncryptedStats (staticCall):", result);
        console.log("[useSilentOur] Result type:", typeof result, "isArray:", Array.isArray(result));
        
        // Process return value: may be array or object
        let total: unknown;
        let average: unknown;
        let max: unknown;
        let best: unknown;
        
        if (Array.isArray(result)) {
          // If array, extract by order
          [total, average, max, best] = result;
          console.log("[useSilentOur] Extracted from array:", { total, average, max, best });
        } else if (result && typeof result === "object") {
          // If object, extract by name
          // ethers.js v6 may return an object containing array and named properties
          const resultObj = result as any;
          
          // Try multiple possible property names
          total = resultObj.total ?? resultObj[0] ?? (Array.isArray(resultObj) ? resultObj[0] : undefined);
          average = resultObj.average ?? resultObj[1] ?? (Array.isArray(resultObj) ? resultObj[1] : undefined);
          max = resultObj.max ?? resultObj[2] ?? (Array.isArray(resultObj) ? resultObj[2] : undefined);
          best = resultObj.bestRecord ?? resultObj[3] ?? (Array.isArray(resultObj) ? resultObj[3] : undefined);
          
          console.log("[useSilentOur] Extracted from object:", { total, average, max, best });
          console.log("[useSilentOur] Object keys:", Object.keys(resultObj));
        } else {
          throw new Error("Unexpected return type from getEncryptedStats");
        }
        
        // Debug: view extracted values
        console.log("[useSilentOur] Extracted values before normalization:", {
          total: { value: total, type: typeof total },
          average: { value: average, type: typeof average },
          max: { value: max, type: typeof max },
          best: { value: best, type: typeof best },
        });

        if (
          sameChain.current(thisChainId) &&
          thisSilentOurAddress === silentOurRef.current?.address
        ) {
          // Normalize handle values to ensure correct format
          const normalizedTotal = normalizeHandle(total);
          const normalizedAverage = normalizeHandle(average);
          const normalizedMax = normalizeHandle(max);
          const normalizedBest = normalizeHandle(best);
          
          // Set handle values (even if normalizeHandle returns undefined, set it for subsequent checks)
          setTotalHandle(normalizedTotal);
          setAverageHandle(normalizedAverage);
          setMaxHandle(normalizedMax);
          setBestRecordHandle(normalizedBest);
          
          // Debug info: check if there are valid handles
          console.log("[useSilentOur] Handles after normalization:", {
            total: normalizedTotal,
            average: normalizedAverage,
            max: normalizedMax,
            best: normalizedBest,
          });
        }

        setMessage(`Statistics fetched successfully! Click Decrypt to view.`);
      } catch (e) {
        console.error("[useSilentOur] getEncryptedStats failed:", e);
        const errorMsg = e instanceof Error ? e.message : String(e);
        if (errorMsg.includes("user rejected")) {
          setMessage(`Transaction cancelled by user`);
        } else {
          setMessage(`Failed to fetch statistics. Please try again.`);
        }
      } finally {
        isFetchingStatsRef.current = false;
        setIsFetchingStats(false);
      }
    },
    [silentOur.address, silentOur.abi, ethersSigner, chainId, sameChain]
  );

  // Decrypt stats
  const canDecrypt = useMemo(() => {
    // Check if at least one valid handle exists (exists and is not zero hash)
    const hasValidHandle = 
      (totalHandle && totalHandle !== ethers.ZeroHash) ||
      (averageHandle && averageHandle !== ethers.ZeroHash) ||
      (maxHandle && maxHandle !== ethers.ZeroHash) ||
      (bestRecordHandle && bestRecordHandle !== ethers.ZeroHash);
    
    return (
      silentOur.address &&
      instance &&
      ethersSigner &&
      !isDecrypting &&
      hasValidHandle
    );
  }, [
    silentOur.address,
    instance,
    ethersSigner,
    isDecrypting,
    totalHandle,
    averageHandle,
    maxHandle,
    bestRecordHandle,
  ]);

  const decryptStats = useCallback(() => {
    if (isDecryptingRef.current) {
      return;
    }

    if (!silentOur.address || !instance || !ethersSigner) {
      return;
    }

    const handles: Array<{ handle: string; contractAddress: string }> = [];
    
    // Ensure all handle values are normalized and verify format again before adding to array
    const normalizedTotalHandle = totalHandle ? normalizeHandle(totalHandle) : undefined;
    const normalizedAverageHandle = averageHandle ? normalizeHandle(averageHandle) : undefined;
    const normalizedMaxHandle = maxHandle ? normalizeHandle(maxHandle) : undefined;
    const normalizedBestRecordHandle = bestRecordHandle ? normalizeHandle(bestRecordHandle) : undefined;

    if (normalizedTotalHandle && normalizedTotalHandle !== ethers.ZeroHash) {
      handles.push({ handle: normalizedTotalHandle, contractAddress: silentOur.address });
    }
    if (normalizedAverageHandle && normalizedAverageHandle !== ethers.ZeroHash) {
      handles.push({ handle: normalizedAverageHandle, contractAddress: silentOur.address });
    }
    if (normalizedMaxHandle && normalizedMaxHandle !== ethers.ZeroHash) {
      handles.push({ handle: normalizedMaxHandle, contractAddress: silentOur.address });
    }
    if (normalizedBestRecordHandle && normalizedBestRecordHandle !== ethers.ZeroHash) {
      handles.push({ handle: normalizedBestRecordHandle, contractAddress: silentOur.address });
    }

    if (handles.length === 0) {
      return;
    }

    const thisChainId = chainId;
    const thisSilentOurAddress = silentOur.address;
    const thisEthersSigner = ethersSigner;

    isDecryptingRef.current = true;
    setIsDecrypting(true);
    setMessage("Preparing to decrypt your statistics...");

    const run = async () => {
      const isStale = () =>
        thisSilentOurAddress !== silentOurRef.current?.address ||
        !sameChain.current(thisChainId) ||
        !sameSigner.current(thisEthersSigner);

      try {
        setMessage("Requesting decryption signature...");
        
        const sig: FhevmDecryptionSignature | null =
          await FhevmDecryptionSignature.loadOrSign(
            instance,
            [silentOur.address as `0x${string}`],
            ethersSigner,
            fhevmDecryptionSignatureStorage
          );

        if (!sig) {
          setMessage("Unable to obtain decryption signature. Please try again.");
          return;
        }

        if (isStale()) {
          setMessage("Operation cancelled due to network change");
          return;
        }

        setMessage("Decrypting your data...");

        const res = await instance.userDecrypt(
          handles,
          sig.privateKey,
          sig.publicKey,
          sig.signature,
          sig.contractAddresses,
          sig.userAddress,
          sig.startTimestamp,
          sig.durationDays
        );

        if (isStale()) {
          setMessage("Operation cancelled due to network change");
          return;
        }

        // Use normalized handle values to find decryption results
        if (normalizedTotalHandle && normalizedTotalHandle !== ethers.ZeroHash) {
          setTotalClear({
            handle: normalizedTotalHandle,
            clear: res[normalizedTotalHandle as `0x${string}`] || BigInt(0),
          });
        }
        if (normalizedAverageHandle && normalizedAverageHandle !== ethers.ZeroHash) {
          setAverageClear({
            handle: normalizedAverageHandle,
            clear: res[normalizedAverageHandle as `0x${string}`] || BigInt(0),
          });
        }
        if (normalizedMaxHandle && normalizedMaxHandle !== ethers.ZeroHash) {
          setMaxClear({
            handle: normalizedMaxHandle,
            clear: res[normalizedMaxHandle as `0x${string}`] || BigInt(0),
          });
        }
        if (normalizedBestRecordHandle && normalizedBestRecordHandle !== ethers.ZeroHash) {
          setBestRecordClear({
            handle: normalizedBestRecordHandle,
            clear: res[normalizedBestRecordHandle as `0x${string}`] || BigInt(0),
          });
        }

        setMessage("Statistics decrypted successfully!");
      } catch (e) {
        console.error("[useSilentOur] decryptStats failed:", e);
        const errorMsg = e instanceof Error ? e.message : String(e);
        if (errorMsg.includes("user rejected")) {
          setMessage(`Decryption cancelled by user`);
        } else {
          setMessage(`Failed to decrypt statistics. Please try again.`);
        }
      } finally {
        isDecryptingRef.current = false;
        setIsDecrypting(false);
      }
    };

    run();
  }, [
    fhevmDecryptionSignatureStorage,
    ethersSigner,
    silentOur.address,
    instance,
    totalHandle,
    averageHandle,
    maxHandle,
    bestRecordHandle,
    chainId,
    sameChain,
    sameSigner,
  ]);

  // Access control
  const grantAccess = useCallback(
    async (viewerAddress: string) => {
      if (!silentOur.address || !ethersSigner) {
        return;
      }

      const thisSilentOurContract = new ethers.Contract(
        silentOur.address,
        silentOur.abi,
        ethersSigner
      );

      try {
        setMessage(`Granting access...`);
        const tx = await thisSilentOurContract.grantAccess(viewerAddress);
        await tx.wait();
        setMessage(`Access granted successfully to ${viewerAddress.slice(0, 6)}...${viewerAddress.slice(-4)}`);
      } catch (e) {
        console.error("[useSilentOur] grantAccess failed:", e);
        const errorMsg = e instanceof Error ? e.message : String(e);
        if (errorMsg.includes("user rejected")) {
          setMessage(`Transaction cancelled by user`);
        } else {
          setMessage(`Failed to grant access. Please try again.`);
        }
      }
    },
    [silentOur.address, silentOur.abi, ethersSigner]
  );

  const revokeAccess = useCallback(
    async (viewerAddress: string) => {
      if (!silentOur.address || !ethersSigner) {
        return;
      }

      const thisSilentOurContract = new ethers.Contract(
        silentOur.address,
        silentOur.abi,
        ethersSigner
      );

      try {
        setMessage(`Revoking access...`);
        const tx = await thisSilentOurContract.revokeAccess(viewerAddress);
        await tx.wait();
        setMessage(`Access revoked successfully from ${viewerAddress.slice(0, 6)}...${viewerAddress.slice(-4)}`);
      } catch (e) {
        console.error("[useSilentOur] revokeAccess failed:", e);
        const errorMsg = e instanceof Error ? e.message : String(e);
        if (errorMsg.includes("user rejected")) {
          setMessage(`Transaction cancelled by user`);
        } else {
          setMessage(`Failed to revoke access. Please try again.`);
        }
      }
    },
    [silentOur.address, silentOur.abi, ethersSigner]
  );

  // Check if current user has permission to view another user's records
  const checkAccessPermission = useCallback(
    async (userAddress: string) => {
      if (!silentOur.address || !ethersReadonlyProvider || !ethersSigner) {
        return false;
      }

      const thisSilentOurContract = new ethers.Contract(
        silentOur.address,
        silentOur.abi,
        ethersReadonlyProvider
      );

      try {
        const hasPermission = await thisSilentOurContract.checkAccessPermission(
          userAddress,
          ethersSigner.address
        );
        return hasPermission;
      } catch (e) {
        console.error("[useSilentOur] checkAccessPermission failed:", e);
        setMessage(`Failed to check permission. Please try again.`);
        return false;
      }
    },
    [silentOur.address, silentOur.abi, ethersReadonlyProvider, ethersSigner]
  );

  // Get user information (record count, etc.)
  const getUserInfo = useCallback(
    async (userAddress: string) => {
      if (!silentOur.address || !ethersReadonlyProvider) {
        return null;
      }

      const thisSilentOurContract = new ethers.Contract(
        silentOur.address,
        silentOur.abi,
        ethersReadonlyProvider
      );

      try {
        const [recordCount, hasRecords] = await thisSilentOurContract.getUserInfo(userAddress);
        return {
          address: userAddress,
          recordCount: Number(recordCount),
          hasRecords,
        };
      } catch (e) {
        console.error("[useSilentOur] getUserInfo failed:", e);
        setMessage(`Failed to retrieve user information. Please try again.`);
        return null;
      }
    },
    [silentOur.address, silentOur.abi, ethersReadonlyProvider]
  );

  return {
    contractAddress: silentOur.address,
    isDeployed,
    canAddRecord,
    canGetRecordCount,
    canDecrypt,
    addOfflineRecord,
    refreshRecordCount,
    getEncryptedStats,
    decryptStats,
    grantAccess,
    revokeAccess,
    checkAccessPermission,
    getUserInfo,
    recordCount,
    isAddingRecord,
    isFetchingStats,
    isDecrypting,
    message,
    totalClear: totalClear?.clear,
    averageClear: averageClear?.clear,
    maxClear: maxClear?.clear,
    bestRecordClear: bestRecordClear?.clear,
  };
};

