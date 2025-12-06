// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract FlareGuardSmartAccount {
    // --- State Variables ---
    enum MarketStatus { SAFE, TRIGGERED }
    MarketStatus public status = MarketStatus.SAFE;

    uint256 public lastTriggeredTime;
    bool public triggered;
    address public owner;

    // --- Events ---
    event RiskTriggered(uint256 indexed marketRisk, bool hasPump, uint256 triggerTime);
    event RiskReset(uint256 resetTime);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    // Called by your Backend when Risk > 80
    function updateRisk(uint256 marketRisk, bool hasPump) public {
        if (marketRisk > 80 || hasPump == true) {
            if (status != MarketStatus.TRIGGERED) {
                status = MarketStatus.TRIGGERED;
                triggered = true;
                lastTriggeredTime = block.timestamp;
                emit RiskTriggered(marketRisk, hasPump, block.timestamp);
            }
        }
    }

    // Manual reset by you (Admin)
    function manualReset() public onlyOwner {
        if (status == MarketStatus.TRIGGERED) {
            status = MarketStatus.SAFE;
            triggered = false;
            emit RiskReset(block.timestamp);
        }
    }
}