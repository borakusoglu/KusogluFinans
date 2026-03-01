export default function FloatingComposeButton({ onClick, showCompose }) {
  if (showCompose) return null;

  return (
    <button
      onClick={onClick}
      style={{
        position: 'fixed', 
        bottom: '24px', 
        right: '24px', 
        padding: '16px', 
        background: '#1a73e8', 
        color: 'white', 
        borderRadius: '50%', 
        border: 'none', 
        cursor: 'pointer', 
        boxShadow: '0 4px 8px rgba(0,0,0,0.2)', 
        zIndex: 50, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        transition: 'all 0.2s'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.1)';
        e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.3)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
      }}
    >
      <svg style={{width: '24px', height: '24px'}} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
    </button>
  );
}
