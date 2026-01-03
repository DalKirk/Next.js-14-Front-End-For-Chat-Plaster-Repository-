export default function Head() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  return (
    <>
      <title>Login</title>
      <meta name="description" content="Sign in to your Starcyeed account." />
      <meta name="robots" content="noindex, nofollow" />
      <link rel="canonical" href={`${base}/login`} />
    </>
  );
}
