import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { file_url, file_name, file_type, file_size, original_file_id, change_notes } = body;

    // Get previous versions to determine version number
    const previousVersions = await base44.asServiceRole.entities.FileVersion.filter({
      original_file_id: original_file_id
    });

    const nextVersionNumber = previousVersions.length + 1;

    // Mark previous version as not current
    if (previousVersions.length > 0) {
      const latestVersion = previousVersions[previousVersions.length - 1];
      await base44.asServiceRole.entities.FileVersion.update(latestVersion.id, {
        is_current: false
      });
    }

    // Create new version
    const newVersion = await base44.asServiceRole.entities.FileVersion.create({
      original_file_id: original_file_id,
      file_url: file_url,
      file_name: file_name,
      file_type: file_type,
      file_size: file_size,
      version_number: nextVersionNumber,
      uploaded_by: user.email,
      change_notes: change_notes || 'Updated file',
      is_current: true
    });

    console.log(`[handleFileUploadWithVersion] Created version ${nextVersionNumber} for file ${original_file_id}`);

    return Response.json({
      success: true,
      file_version_id: newVersion.id,
      version_number: nextVersionNumber,
      file_url: file_url
    });
  } catch (error) {
    console.error('[handleFileUploadWithVersion] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});