// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title SilentOur - Encrypted Daily Offline Time Tracking System
/// @notice A privacy-friendly DApp for tracking daily offline time using Fully Homomorphic Encryption
/// @dev All offline time records are stored encrypted on-chain, enabling computation without revealing plaintext
contract SilentOur is ZamaEthereumConfig {
    /// @notice Structure to store a single encrypted offline time record
    struct OfflineRecord {
        euint32 encryptedMinutes; // Encrypted offline minutes
        uint256 timestamp;        // Block timestamp when record was created
    }

    /// @notice Mapping from user address to their array of offline records
    mapping(address => OfflineRecord[]) public dailyOfflineRecords;

    /// @notice Mapping from user address to authorized viewer addresses
    /// @dev accessControl[user][viewer] = true means viewer can decrypt user's records
    mapping(address => mapping(address => bool)) public accessControl;

    /// @notice Event emitted when a new offline record is added
    event OfflineRecordAdded(address indexed user, uint256 timestamp, uint256 recordIndex);

    /// @notice Event emitted when access is granted
    event AccessGranted(address indexed user, address indexed viewer);

    /// @notice Event emitted when access is revoked
    event AccessRevoked(address indexed user, address indexed viewer);

    /// @notice Add a new offline time record for the caller
    /// @param encryptedMinutes The encrypted offline minutes (euint32)
    /// @param inputProof The zero-knowledge proof for the encrypted input
    /// @dev The encrypted value is added to the user's record array
    ///      ACL permissions are set to allow the contract and user to decrypt
    function addOfflineRecord(externalEuint32 encryptedMinutes, bytes calldata inputProof) external {
        euint32 encryptedEuint32 = FHE.fromExternal(encryptedMinutes, inputProof);

        // Create a new record
        OfflineRecord memory newRecord = OfflineRecord({
            encryptedMinutes: encryptedEuint32,
            timestamp: block.timestamp
        });

        dailyOfflineRecords[msg.sender].push(newRecord);

        // Set ACL permissions: allow contract and user to decrypt
        FHE.allowThis(encryptedEuint32);
        FHE.allow(encryptedEuint32, msg.sender);

        emit OfflineRecordAdded(msg.sender, block.timestamp, dailyOfflineRecords[msg.sender].length - 1);
    }

    /// @notice Get the total encrypted offline time for a user within a time period
    /// @param user The address of the user
    /// @param startTime Start timestamp of the period (inclusive)
    /// @param endTime End timestamp of the period (inclusive)
    /// @return The encrypted sum of offline minutes in the period
    /// @dev Only the user or authorized viewers can decrypt the result
    function getEncryptedTotal(
        address user,
        uint256 startTime,
        uint256 endTime
    ) external returns (euint32) {
        require(
            user == msg.sender || accessControl[user][msg.sender],
            "SilentOur: Not authorized to view this user's records"
        );

        OfflineRecord[] memory records = dailyOfflineRecords[user];
        euint32 total = FHE.asEuint32(0);

        for (uint256 i = 0; i < records.length; i++) {
            if (records[i].timestamp >= startTime && records[i].timestamp <= endTime) {
                total = FHE.add(total, records[i].encryptedMinutes);
            }
        }

        // Set ACL permissions for the result
        FHE.allowThis(total);
        FHE.allow(total, msg.sender);

        return total;
    }

    /// @notice Get the average encrypted offline time for a user within a time period
    /// @param user The address of the user
    /// @param startTime Start timestamp of the period (inclusive)
    /// @param endTime End timestamp of the period (inclusive)
    /// @return The encrypted average of offline minutes in the period
    /// @dev Only the user or authorized viewers can decrypt the result
    function getEncryptedAverage(
        address user,
        uint256 startTime,
        uint256 endTime
    ) external returns (euint32) {
        require(
            user == msg.sender || accessControl[user][msg.sender],
            "SilentOur: Not authorized to view this user's records"
        );

        OfflineRecord[] memory records = dailyOfflineRecords[user];
        euint32 total = FHE.asEuint32(0);
        uint256 count = 0;

        for (uint256 i = 0; i < records.length; i++) {
            if (records[i].timestamp >= startTime && records[i].timestamp <= endTime) {
                total = FHE.add(total, records[i].encryptedMinutes);
                count++;
            }
        }

        if (count == 0) {
            euint32 zero = FHE.asEuint32(0);
            FHE.allowThis(zero);
            FHE.allow(zero, msg.sender);
            return zero;
        }

        // Divide total by count (divisor must be plaintext)
        euint32 average = FHE.div(total, uint32(count));

        // Set ACL permissions for the result
        FHE.allowThis(average);
        FHE.allow(average, msg.sender);

        return average;
    }

    /// @notice Get the maximum encrypted offline time for a user within a time period
    /// @param user The address of the user
    /// @param startTime Start timestamp of the period (inclusive)
    /// @param endTime End timestamp of the period (inclusive)
    /// @return The encrypted maximum offline minutes in the period
    /// @dev Only the user or authorized viewers can decrypt the result
    function getEncryptedMax(
        address user,
        uint256 startTime,
        uint256 endTime
    ) external returns (euint32) {
        require(
            user == msg.sender || accessControl[user][msg.sender],
            "SilentOur: Not authorized to view this user's records"
        );

        OfflineRecord[] memory records = dailyOfflineRecords[user];
        
        if (records.length == 0) {
            euint32 zero = FHE.asEuint32(0);
            FHE.allowThis(zero);
            FHE.allow(zero, msg.sender);
            return zero;
        }

        euint32 maxValue = FHE.asEuint32(0);
        bool found = false;

        for (uint256 i = 0; i < records.length; i++) {
            if (records[i].timestamp >= startTime && records[i].timestamp <= endTime) {
                if (!found) {
                    maxValue = records[i].encryptedMinutes;
                    found = true;
                } else {
                    // Compare encrypted values: if records[i].encryptedMinutes > maxValue, use records[i].encryptedMinutes
                    // FHE.select(condition, ifTrue, ifFalse) - condition must be ebool
                    ebool isGreater = FHE.gt(records[i].encryptedMinutes, maxValue);
                    maxValue = FHE.select(isGreater, records[i].encryptedMinutes, maxValue);
                }
            }
        }

        if (!found) {
            euint32 zero = FHE.asEuint32(0);
            FHE.allowThis(zero);
            FHE.allow(zero, msg.sender);
            return zero;
        }

        // Set ACL permissions for the result
        FHE.allowThis(maxValue);
        FHE.allow(maxValue, msg.sender);

        return maxValue;
    }

    /// @notice Check if encrypted offline time meets or exceeds a target (encrypted comparison)
    /// @param user The address of the user
    /// @param startTime Start timestamp of the period (inclusive)
    /// @param endTime End timestamp of the period (inclusive)
    /// @param targetMinutes The encrypted target minutes to compare against
    /// @param targetProof The zero-knowledge proof for the target
    /// @return An encrypted boolean indicating if the total meets or exceeds the target
    /// @dev Only the user or authorized viewers can decrypt the result
    function compareEncryptedTotal(
        address user,
        uint256 startTime,
        uint256 endTime,
        externalEuint32 targetMinutes,
        bytes calldata targetProof
    ) external returns (ebool) {
        require(
            user == msg.sender || accessControl[user][msg.sender],
            "SilentOur: Not authorized to view this user's records"
        );

        euint32 encryptedTarget = FHE.fromExternal(targetMinutes, targetProof);
        euint32 total = getEncryptedTotalInternal(user, startTime, endTime);

        // Compare total >= target
        ebool result = FHE.ge(total, encryptedTarget);

        // Set ACL permissions for the result
        FHE.allowThis(result);
        FHE.allow(result, msg.sender);

        return result;
    }

    /// @notice Get the best (maximum) encrypted offline time record for a user
    /// @param user The address of the user
    /// @return The encrypted maximum offline minutes across all records
    /// @dev Only the user or authorized viewers can decrypt the result
    function getEncryptedBestRecord(address user) external returns (euint32) {
        require(
            user == msg.sender || accessControl[user][msg.sender],
            "SilentOur: Not authorized to view this user's records"
        );

        OfflineRecord[] memory records = dailyOfflineRecords[user];
        
        if (records.length == 0) {
            euint32 zero = FHE.asEuint32(0);
            FHE.allowThis(zero);
            FHE.allow(zero, msg.sender);
            return zero;
        }

        euint32 maxValue = records[0].encryptedMinutes;

        for (uint256 i = 1; i < records.length; i++) {
            ebool isGreater = FHE.gt(records[i].encryptedMinutes, maxValue);
            maxValue = FHE.select(isGreater, records[i].encryptedMinutes, maxValue);
        }

        // Set ACL permissions for the result
        FHE.allowThis(maxValue);
        FHE.allow(maxValue, msg.sender);

        return maxValue;
    }

    /// @notice Get all encrypted statistics for a user in one transaction
    /// @param user The address of the user
    /// @param startTime Start timestamp of the period (inclusive)
    /// @param endTime End timestamp of the period (inclusive)
    /// @return total The encrypted sum of offline minutes in the period
    /// @return average The encrypted average of offline minutes in the period
    /// @return max The encrypted maximum offline minutes in the period
    /// @return bestRecord The encrypted maximum offline minutes across all records
    /// @dev Only the user or authorized viewers can decrypt the results
    ///      This function combines getEncryptedTotal, getEncryptedAverage, getEncryptedMax, and getEncryptedBestRecord
    ///      into a single transaction to reduce gas costs and improve efficiency
    function getEncryptedStats(
        address user,
        uint256 startTime,
        uint256 endTime
    ) external returns (
        euint32 total,
        euint32 average,
        euint32 max,
        euint32 bestRecord
    ) {
        require(
            user == msg.sender || accessControl[user][msg.sender],
            "SilentOur: Not authorized to view this user's records"
        );

        OfflineRecord[] memory records = dailyOfflineRecords[user];
        
        // Initialize variables
        euint32 periodTotal = FHE.asEuint32(0);
        uint256 periodCount = 0;
        euint32 periodMax = FHE.asEuint32(0);
        bool periodFound = false;
        
        // Used to calculate maximum value across all records
        euint32 allTimeMax = records.length > 0 ? records[0].encryptedMinutes : FHE.asEuint32(0);

        // Single pass to calculate all statistics
        for (uint256 i = 0; i < records.length; i++) {
            // Calculate maximum value across all records (for bestRecord)
            if (i > 0) {
                ebool isGreater = FHE.gt(records[i].encryptedMinutes, allTimeMax);
                allTimeMax = FHE.select(isGreater, records[i].encryptedMinutes, allTimeMax);
            }
            
            // Calculate statistics within the time period
            if (records[i].timestamp >= startTime && records[i].timestamp <= endTime) {
                // Accumulate sum
                periodTotal = FHE.add(periodTotal, records[i].encryptedMinutes);
                periodCount++;
                
                // Calculate maximum
                if (!periodFound) {
                    periodMax = records[i].encryptedMinutes;
                    periodFound = true;
                } else {
                    ebool isGreater = FHE.gt(records[i].encryptedMinutes, periodMax);
                    periodMax = FHE.select(isGreater, records[i].encryptedMinutes, periodMax);
                }
            }
        }

        // Handle case where there are no records in the time period
        if (periodCount == 0) {
            euint32 zero = FHE.asEuint32(0);
            FHE.allowThis(zero);
            FHE.allow(zero, msg.sender);
            total = zero;
            average = zero;
            max = zero;
        } else {
            // Set ACL for total
            FHE.allowThis(periodTotal);
            FHE.allow(periodTotal, msg.sender);
            total = periodTotal;
            
            // Calculate average
            euint32 periodAverage = FHE.div(periodTotal, uint32(periodCount));
            FHE.allowThis(periodAverage);
            FHE.allow(periodAverage, msg.sender);
            average = periodAverage;
            
            // Set ACL for max
            FHE.allowThis(periodMax);
            FHE.allow(periodMax, msg.sender);
            max = periodMax;
        }

        // Handle case where all records are empty
        if (records.length == 0) {
            euint32 zero = FHE.asEuint32(0);
            FHE.allowThis(zero);
            FHE.allow(zero, msg.sender);
            bestRecord = zero;
        } else {
            // Set ACL for bestRecord
            FHE.allowThis(allTimeMax);
            FHE.allow(allTimeMax, msg.sender);
            bestRecord = allTimeMax;
        }
    }

    /// @notice Get the number of records for a user
    /// @param user The address of the user
    /// @return The number of records
    function getRecordCount(address user) external view returns (uint256) {
        return dailyOfflineRecords[user].length;
    }

    /// @notice Get a specific record's timestamp (plaintext, for filtering)
    /// @param user The address of the user
    /// @param index The index of the record
    /// @return The timestamp of the record
    function getRecordTimestamp(address user, uint256 index) external view returns (uint256) {
        require(index < dailyOfflineRecords[user].length, "SilentOur: Record index out of bounds");
        return dailyOfflineRecords[user][index].timestamp;
    }

    /// @notice Grant access to a viewer address to decrypt the caller's records
    /// @param viewer The address to grant access to
    function grantAccess(address viewer) external {
        require(viewer != address(0), "SilentOur: Invalid viewer address");
        require(viewer != msg.sender, "SilentOur: Cannot grant access to yourself");
        
        accessControl[msg.sender][viewer] = true;
        emit AccessGranted(msg.sender, viewer);
    }

    /// @notice Revoke access from a viewer address
    /// @param viewer The address to revoke access from
    function revokeAccess(address viewer) external {
        accessControl[msg.sender][viewer] = false;
        emit AccessRevoked(msg.sender, viewer);
    }

    /// @notice Check if a viewer has permission to view a user's records
    /// @param user The address of the user whose records are being checked
    /// @param viewer The address of the viewer to check permission for
    /// @return True if the viewer has permission to view the user's records, false otherwise
    function checkAccessPermission(address user, address viewer) external view returns (bool) {
        return accessControl[user][viewer];
    }

    /// @notice Get information about a user
    /// @param user The address of the user to query
    /// @return recordCount The number of records the user has
    /// @return hasRecords True if the user has at least one record, false otherwise
    function getUserInfo(address user) external view returns (uint256 recordCount, bool hasRecords) {
        recordCount = dailyOfflineRecords[user].length;
        hasRecords = recordCount > 0;
    }

    /// @notice Internal helper function to calculate total encrypted offline time
    /// @param user The address of the user
    /// @param startTime Start timestamp of the period (inclusive)
    /// @param endTime End timestamp of the period (inclusive)
    /// @return The encrypted sum of offline minutes in the period
    function getEncryptedTotalInternal(
        address user,
        uint256 startTime,
        uint256 endTime
    ) internal returns (euint32) {
        OfflineRecord[] memory records = dailyOfflineRecords[user];
        euint32 total = FHE.asEuint32(0);

        for (uint256 i = 0; i < records.length; i++) {
            if (records[i].timestamp >= startTime && records[i].timestamp <= endTime) {
                total = FHE.add(total, records[i].encryptedMinutes);
            }
        }

        return total;
    }
}

