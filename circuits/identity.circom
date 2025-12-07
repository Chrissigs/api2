pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/poseidon.circom";

/**
 * Universal Identity Circuit
 * Uses a "Claims Vector" approach to be jurisdiction-agnostic.
 * param nClaims: Number of claims to include (default 16).
 */
template IdentityCircuit(nClaims) {
    // Private inputs: Array of Claims (as Field Elements/Integers)
    signal input claims[nClaims];
    signal input salt;
    
    // Public output: The Identity Commitment (Hash of Claims + Salt)
    signal output identity_commitment;

    // Use Poseidon hash over the vector
    // Since Poseidon usually takes up to 6/16 inputs per round effectively,
    // we may need to chain them if nClaims is large.
    // However, for nClaims=16, we might need a multi-input hasher or Merkle Tree.
    // For simplicity in this V2 refactor, we will linear chain or use a large Poseidon if available.
    // Let's use a Chained approach for flexibility: Hash(Previous + Current).
    
    signal intermediate[nClaims];
    component hashers[nClaims];

    // Initial hash: Claim[0] + Salt
    hashers[0] = Poseidon(2);
    hashers[0].inputs[0] <== claims[0];
    hashers[0].inputs[1] <== salt;
    intermediate[0] <== hashers[0].out;

    // Chain remaining claims
    for (var i = 1; i < nClaims; i++) {
        hashers[i] = Poseidon(2);
        hashers[i].inputs[0] <== intermediate[i-1];
        hashers[i].inputs[1] <== claims[i];
        intermediate[i] <== hashers[i].out;
    }

    identity_commitment <== intermediate[nClaims-1];
}

component main = IdentityCircuit(16);
