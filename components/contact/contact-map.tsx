export default function ContactMap() {
  return (
    <div className="rounded-lg overflow-hidden shadow-md h-[400px]">
      <iframe
        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d63692.10661814218!2d30.30571116606362!3d1.3120195923807633!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x19dbe7eb2f8f9f2f%3A0x24b3fd0aab633514!2sNyagatare!5e0!3m2!1sen!2srw!4v1715763402462!5m2!1sen!2srw"
        width="100%"
        height="100%"
        style={{ border: 0 }}
        allowFullScreen
        loading="lazy"
        title="Nyagatare Location"
      ></iframe>
    </div>
  );
}
