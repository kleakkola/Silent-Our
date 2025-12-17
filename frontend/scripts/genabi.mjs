import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "fs";
import { join } from "path";

const CONTRACTS_DEPLOYMENT_DIR = join(
  process.cwd(),
  "../contracts/deployments"
);

const ABI_OUTPUT_DIR = join(process.cwd(), "abi");

function getDeployments() {
  const deployments = {};
  
  if (!existsSync(CONTRACTS_DEPLOYMENT_DIR)) {
    console.warn(`Deployment directory not found: ${CONTRACTS_DEPLOYMENT_DIR}`);
    return deployments;
  }

  // Auto-detect all network directories
  const networkDirs = readdirSync(CONTRACTS_DEPLOYMENT_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
  
  // Chain ID mapping for known networks
  const chainIdMap = {
    localhost: 31337,
    hardhat: 31337,
    sepolia: 11155111,
  };
  
  for (const network of networkDirs) {
    const networkDir = join(CONTRACTS_DEPLOYMENT_DIR, network);
    const contractFile = join(networkDir, "SilentOur.json");
    
    if (existsSync(contractFile)) {
      try {
        const deployment = JSON.parse(readFileSync(contractFile, "utf-8"));
        const chainId = deployment.chainId || chainIdMap[network] || null;
        
        if (chainId && deployment.address) {
          deployments[chainId] = {
            address: deployment.address,
            chainId: chainId,
            chainName: network,
          };
          console.log(`Found deployment for ${network} (chainId: ${chainId}) at ${deployment.address}`);
        } else {
          console.warn(`Skipping ${network}: missing chainId or address`);
        }
      } catch (error) {
        console.warn(`Error reading deployment file for ${network}:`, error.message);
      }
    } else {
      console.log(`No deployment found for ${network}, skipping...`);
    }
  }
  
  return deployments;
}

function generateABIFile() {
  // Try to read ABI from artifacts
  const artifactsPath = join(
    CONTRACTS_DEPLOYMENT_DIR,
    "../artifacts/contracts/SilentOur.sol/SilentOur.json"
  );
  
  let abi = [];
  
  if (existsSync(artifactsPath)) {
    const artifact = JSON.parse(readFileSync(artifactsPath, "utf-8"));
    abi = artifact.abi || [];
  } else {
    console.warn(`Artifact not found: ${artifactsPath}`);
    // Fallback: minimal ABI structure
    abi = [];
  }
  
  return abi;
}

function main() {
  console.log("Generating ABI files...");
  
  if (!existsSync(ABI_OUTPUT_DIR)) {
    mkdirSync(ABI_OUTPUT_DIR, { recursive: true });
  }
  
  const abi = generateABIFile();
  const deployments = getDeployments();
  
  // Write ABI file
  const abiContent = `// Auto-generated file - do not edit manually
export const SilentOurABI = {
  abi: ${JSON.stringify(abi, null, 2)},
} as const;
`;
  
  writeFileSync(join(ABI_OUTPUT_DIR, "SilentOurABI.ts"), abiContent);
  
  // Write addresses file
  const addressesContent = `// Auto-generated file - do not edit manually
export const SilentOurAddresses = ${JSON.stringify(deployments, null, 2)} as const;
`;
  
  writeFileSync(join(ABI_OUTPUT_DIR, "SilentOurAddresses.ts"), addressesContent);
  
  console.log("ABI files generated successfully!");
  console.log(`Found deployments for ${Object.keys(deployments).length} networks`);
  if (Object.keys(deployments).length === 0) {
    console.warn("Warning: No deployments found. Make sure contracts are deployed first.");
  }
}

main();

