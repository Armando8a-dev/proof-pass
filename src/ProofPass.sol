// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "openzeppelin-contracts/contracts/token/ERC721/ERC721.sol";
import "openzeppelin-contracts/contracts/access/Ownable.sol";

/// @title ProofPass — Soulbound credential NFTs issued by a trusted authority
contract ProofPass is ERC721, Ownable {
    uint256 private _nextTokenId;

    mapping(uint256 => string) public badgeType;
    mapping(address => bool) public hasBadge;

    event BadgeIssued(address indexed to, uint256 indexed tokenId, string badgeType);
    event BadgeRevoked(address indexed from, uint256 indexed tokenId);

    error AlreadyHasBadge();
    error NotOwnerOfBadge();
    error TransferNotAllowed();
    error EmptyBadgeType();

    constructor(address _owner) ERC721("ProofPass", "PROOF") Ownable(_owner) {}

    // ─── Owner ────────────────────────────────────────────────────────────────

    /// @notice Issue a soulbound credential badge to a wallet
    function issueBadge(address to, string calldata _badgeType) external onlyOwner returns (uint256) {
        if (hasBadge[to]) revert AlreadyHasBadge();
        if (bytes(_badgeType).length == 0) revert EmptyBadgeType();

        uint256 tokenId = _nextTokenId++;
        hasBadge[to] = true;
        badgeType[tokenId] = _badgeType;

        _safeMint(to, tokenId);

        emit BadgeIssued(to, tokenId, _badgeType);
        return tokenId;
    }

    /// @notice Revoke a badge — burns the token and clears the holder's slot
    function revokeBadge(uint256 tokenId) external onlyOwner {
        address holder = ownerOf(tokenId);
        hasBadge[holder] = false;
        delete badgeType[tokenId];

        _burn(tokenId);

        emit BadgeRevoked(holder, tokenId);
    }

    // ─── Soulbound enforcement ────────────────────────────────────────────────

    function transferFrom(address, address, uint256) public pure override {
        revert TransferNotAllowed();
    }

    function safeTransferFrom(address, address, uint256, bytes memory) public pure override {
        revert TransferNotAllowed();
    }

    // ─── View ─────────────────────────────────────────────────────────────────

    function totalIssued() external view returns (uint256) {
        return _nextTokenId;
    }
}
