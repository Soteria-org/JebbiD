"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Called by KYCUploadPanel after it successfully uploads a file to Supabase Storage.
 * The client component handles the binary upload directly (file never routes through
 * the server, which saves memory on large images); this action handles the DB side:
 * recording the metadata and checking whether all three KYC documents are now present.
 *
 * @param {object} params
 * @param {string} params.investorProfileId - The profile.id of the investor whose KYC this is
 * @param {string} params.documentType - One of: selfie, national_id_front, national_id_back
 * @param {string} params.storagePath - Full path within the kyc-documents bucket
 */
export async function recordDocumentUpload({ investorProfileId, documentType, storagePath }) {
  const supabase = await createClient();

  const VALID_KYC_TYPES = ["selfie", "national_id_front", "national_id_back"];
  if (!VALID_KYC_TYPES.includes(documentType)) {
    return { error: "Invalid document type: " + documentType };
  }

  // Upsert: if this investor has already uploaded this document type, replace the
  // row rather than creating a duplicate. Uniqueness is by (owner_profile_id, document_type).
  // Note: uploaded_documents has no unique constraint on this combination yet — the
  // "latest wins" behavior is achieved by deleting the old row first if it exists.
  const { data: existing } = await supabase
    .from("uploaded_documents")
    .select("id")
    .eq("owner_profile_id", investorProfileId)
    .eq("document_type", documentType)
    .maybeSingle();

  if (existing) {
    await supabase.from("uploaded_documents").delete().eq("id", existing.id);
  }

  const { error: insertError } = await supabase.from("uploaded_documents").insert({
    owner_profile_id: investorProfileId,
    document_type: documentType,
    storage_bucket: "kyc-documents",
    storage_path: storagePath,
    related_table: "profiles",
    related_id: investorProfileId,
    verified: false,
  });
  if (insertError) return { error: insertError.message };

  // Check whether all three required documents now exist, and if so, advance
  // kyc_status from 'not_started' → 'pending' (staff still needs to verify).
  // Already-approved KYC is left alone even if a document is re-uploaded.
  const { data: docs } = await supabase
    .from("uploaded_documents")
    .select("document_type")
    .eq("owner_profile_id", investorProfileId)
    .in("document_type", VALID_KYC_TYPES);

  const uploadedTypes = (docs || []).map((d) => d.document_type);
  const allPresent = VALID_KYC_TYPES.every((t) => uploadedTypes.includes(t));

  if (allPresent) {
    const { data: detail } = await supabase
      .from("investor_details")
      .select("kyc_status")
      .eq("profile_id", investorProfileId)
      .maybeSingle();

    if (detail && detail.kyc_status === "not_started") {
      await supabase
        .from("investor_details")
        .update({ kyc_status: "pending" })
        .eq("profile_id", investorProfileId);
    }
  }

  await supabase.rpc("log_audit", {
    p_action: "KYC Document Uploaded",
    p_entity_table: "uploaded_documents",
    p_entity_id: null,
    p_previous_value: null,
    p_new_value: { investor_profile_id: investorProfileId, document_type: documentType, storage_path: storagePath },
  });

  return { success: true, allDocumentsUploaded: allPresent };
}

/**
 * Returns a list of which KYC document types have been uploaded for an investor.
 * Used by KYCUploadPanel to show current state on load.
 */
export async function getKycDocumentStatus(investorProfileId) {
  const supabase = await createClient();

  const { data: docs, error } = await supabase
    .from("uploaded_documents")
    .select("document_type, storage_path, uploaded_at, verified")
    .eq("owner_profile_id", investorProfileId)
    .in("document_type", ["selfie", "national_id_front", "national_id_back"]);

  if (error) return { error: error.message };

  const { data: detail } = await supabase
    .from("investor_details")
    .select("kyc_status")
    .eq("profile_id", investorProfileId)
    .maybeSingle();

  return {
    success: true,
    documents: docs || [],
    kycStatus: detail?.kyc_status ?? "not_started",
  };
}

/**
 * Staff only: mark an individual document as verified, or flip KYC status to
 * approved / rejected at the investor level. Investors cannot call this.
 */
export async function updateKycVerification({ investorProfileId, action, reason }) {
  const supabase = await createClient();

  const { data: caller } = await supabase.auth.getUser();
  if (!caller.user) return { error: "Not signed in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", caller.user.id)
    .maybeSingle();

  if (!profile || !["finance_officer", "super_admin"].includes(profile.role)) {
    return { error: "Only Finance Officers and Super Admins can verify KYC documents." };
  }

  const validActions = ["approve", "reject", "reset"];
  if (!validActions.includes(action)) return { error: "Invalid action." };

  const newStatus = action === "approve" ? "approved" : action === "reject" ? "rejected" : "not_started";

  const { error } = await supabase
    .from("investor_details")
    .update({ kyc_status: newStatus })
    .eq("profile_id", investorProfileId);

  if (error) return { error: error.message };

  await supabase.rpc("log_audit", {
    p_action: "KYC Status Updated",
    p_entity_table: "investor_details",
    p_entity_id: null,
    p_previous_value: null,
    p_new_value: { investor_profile_id: investorProfileId, new_kyc_status: newStatus, reason: reason ?? null },
  });

  return { success: true, newStatus };
}
