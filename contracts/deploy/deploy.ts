import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedSilentOur = await deploy("SilentOur", {
    from: deployer,
    log: true,
    waitConfirmations: 1,
  });

  console.log(`SilentOur contract deployed at: ${deployedSilentOur.address}`);
  console.log(`Transaction hash: ${deployedSilentOur.transactionHash}`);
};
export default func;
func.id = "deploy_silentOur"; // id required to prevent reexecution
func.tags = ["SilentOur"];

