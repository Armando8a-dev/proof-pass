// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Test.sol";
import "../src/ProofPass.sol";

contract ProofPassTest is Test {
    ProofPass public pass;

    address owner = address(0x1);
    address alice = address(0x2);
    address bob = address(0x3);
    address stranger = address(0x99);

    string constant BADGE = "Certified Blockchain Dev";

    function setUp() public {
        vm.prank(owner);
        pass = new ProofPass(owner);
    }

    // ─── issueBadge ───────────────────────────────────────────────────────────

    function test_issueBadge_mintsBadge() public {
        vm.prank(owner);
        uint256 id = pass.issueBadge(alice, BADGE);

        assertEq(pass.ownerOf(id), alice);
        assertEq(pass.badgeType(id), BADGE);
        assertTrue(pass.hasBadge(alice));
    }

    function test_issueBadge_incrementsTokenId() public {
        vm.startPrank(owner);
        uint256 id0 = pass.issueBadge(alice, BADGE);
        uint256 id1 = pass.issueBadge(bob, "Hackathon Winner");
        vm.stopPrank();

        assertEq(id0, 0);
        assertEq(id1, 1);
        assertEq(pass.totalIssued(), 2);
    }

    function test_issueBadge_emitsEvent() public {
        vm.expectEmit(true, true, false, true);
        emit ProofPass.BadgeIssued(alice, 0, BADGE);

        vm.prank(owner);
        pass.issueBadge(alice, BADGE);
    }

    function test_issueBadge_revertsIfNotOwner() public {
        vm.prank(stranger);
        vm.expectRevert();
        pass.issueBadge(alice, BADGE);
    }

    function test_issueBadge_revertsIfAlreadyHasBadge() public {
        vm.startPrank(owner);
        pass.issueBadge(alice, BADGE);

        vm.expectRevert(ProofPass.AlreadyHasBadge.selector);
        pass.issueBadge(alice, "Another Badge");
        vm.stopPrank();
    }

    function test_issueBadge_revertsIfEmptyBadgeType() public {
        vm.prank(owner);
        vm.expectRevert(ProofPass.EmptyBadgeType.selector);
        pass.issueBadge(alice, "");
    }

    // ─── revokeBadge ──────────────────────────────────────────────────────────

    function test_revokeBadge_burnsBadge() public {
        vm.startPrank(owner);
        uint256 id = pass.issueBadge(alice, BADGE);
        pass.revokeBadge(id);
        vm.stopPrank();

        assertFalse(pass.hasBadge(alice));
        assertEq(pass.badgeType(id), "");
        assertEq(pass.totalIssued(), 1); // counter keeps incrementing, it's not decremented
    }

    function test_revokeBadge_emitsEvent() public {
        vm.startPrank(owner);
        uint256 id = pass.issueBadge(alice, BADGE);

        vm.expectEmit(true, true, false, false);
        emit ProofPass.BadgeRevoked(alice, id);

        pass.revokeBadge(id);
        vm.stopPrank();
    }

    function test_revokeBadge_revertsIfNotOwner() public {
        vm.prank(owner);
        uint256 id = pass.issueBadge(alice, BADGE);

        vm.prank(stranger);
        vm.expectRevert();
        pass.revokeBadge(id);
    }

    function test_revokeBadge_allowsReissuingToSameAddress() public {
        vm.startPrank(owner);
        uint256 id = pass.issueBadge(alice, BADGE);
        pass.revokeBadge(id);

        // after revoke, alice can receive a new badge
        uint256 newId = pass.issueBadge(alice, "Advanced Certification");
        vm.stopPrank();

        assertEq(pass.ownerOf(newId), alice);
        assertTrue(pass.hasBadge(alice));
    }

    // ─── Soulbound: transfers blocked ─────────────────────────────────────────

    function test_transferFrom_reverts() public {
        vm.prank(owner);
        uint256 id = pass.issueBadge(alice, BADGE);

        vm.prank(alice);
        vm.expectRevert(ProofPass.TransferNotAllowed.selector);
        pass.transferFrom(alice, bob, id);
    }

    function test_safeTransferFrom_reverts() public {
        vm.prank(owner);
        uint256 id = pass.issueBadge(alice, BADGE);

        vm.prank(alice);
        vm.expectRevert(ProofPass.TransferNotAllowed.selector);
        pass.safeTransferFrom(alice, bob, id, "");
    }

    // ─── View ─────────────────────────────────────────────────────────────────

    function test_totalIssued_startsAtZero() public view {
        assertEq(pass.totalIssued(), 0);
    }

    function test_hasBadge_falseForNewAddress() public view {
        assertFalse(pass.hasBadge(stranger));
    }

    // ─── fuzz ─────────────────────────────────────────────────────────────────

    function testFuzz_issueBadge_uniqueTokenIds(uint8 count) public {
        count = uint8(bound(count, 1, 20));
        vm.startPrank(owner);
        for (uint256 i = 0; i < count; i++) {
            address recipient = address(uint160(0x1000 + i));
            pass.issueBadge(recipient, BADGE);
        }
        vm.stopPrank();

        assertEq(pass.totalIssued(), count);
    }
}
