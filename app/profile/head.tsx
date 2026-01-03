export default function Head() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  return (
    <>
      <title>Profile</title>
      <meta name="description" content="View and edit your Starcyeed profile." />
      <meta name="robots" content="noindex, nofollow" />
      <link rel="canonical" href={`${base}/profile`} />
    </>
  );
}
