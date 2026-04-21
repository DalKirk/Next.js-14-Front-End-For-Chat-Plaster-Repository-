export default function Head() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  return (
    <>
      <title>Sign Up</title>
      <meta name="description" content="Create your Starcyeed account to get started." />
      <meta name="robots" content="noindex, nofollow" />
      <link rel="canonical" href={`${base}/signup`} />
    </>
  );
}
