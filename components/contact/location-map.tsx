export default function LocationMap() {
  return (
    <div className="rounded-lg overflow-hidden shadow-md h-[400px]">
      <iframe
        src="https://www.google.com/maps/embed?pb=!1m17!1m12!1m3!1d416.6172288167306!2d30.33274696022951!3d-1.2991557206547872!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m2!1m1!2zMcKwMTcnNTcuMCJTIDMwwrAxOSc1OS4xIkU!5e1!3m2!1sen!2sus!4v1763169601231!5m2!1sen!2sus"
        width="100%"
        height="100%"
        style={{ border: 0 }}
        allowFullScreen
        loading="lazy"
        title="NTDM Animal Hospital Location - Nyagatare"
      ></iframe>
    </div>
  );
}
