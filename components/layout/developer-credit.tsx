const DEVELOPER_NAME = "Munyarukina Abel"
const DEVELOPER_LINKEDIN_URL = "https://www.linkedin.com/in/munyarukina-abel-4041a1184"

export function DeveloperCredit({
  label = "Designed & developed by",
  className = "",
}: {
  label?: string
  className?: string
}) {
  return (
    <p className={className}>
      {label}{" "}
      <a
        href={DEVELOPER_LINKEDIN_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-primary focus-visible:text-primary underline-offset-2 hover:underline focus-visible:underline focus-visible:outline-none transition-colors"
      >
        {DEVELOPER_NAME}
      </a>
    </p>
  )
}
