// A cookie refresh can fail after browser history restoration. Validate an
// existing in-memory access token before discarding it; never extend its life.
export async function restoreSession({ refresh, readProfile, accessToken }) {
  try {
    return (await refresh()).data;
  } catch (error) {
    if (error.status !== 401 || !accessToken) throw error;
    const result = await readProfile(accessToken);
    return { accessToken, user: result.data };
  }
}
