"use client"

interface AvatarDisplayProps {
  avatar: string
  avatarType: "emoji" | "image"
  size?: "small" | "medium" | "large"
  className?: string
}

export function AvatarDisplay({ avatar, avatarType, size = "medium", className = "" }: AvatarDisplayProps) {
  console.log("AvatarDisplay props:", { avatar, avatarType, size })
  
  const sizeClasses = {
    small: "w-8 h-8 text-2xl",
    medium: "w-16 h-16 text-4xl",
    large: "w-24 h-24 text-6xl"
  }

  const baseClasses = `flex items-center justify-center ${sizeClasses[size]} ${className}`
  console.log("Base classes:", baseClasses)

  console.log("AvatarDisplay checking:", avatarType, "equals image?", avatarType === "image")

  if (avatarType === "image") {
    console.log("Rendering image avatar:", avatar)
    return (
      <div className={baseClasses}>
        <img 
          src={avatar} 
          alt="Character avatar" 
          className="w-full h-full object-contain rounded-lg"
          onLoad={() => console.log("Image loaded successfully:", avatar)}
          onError={(e) => {
            console.log("Image failed to load:", avatar)
            // Fallback to emoji if image fails to load
            const target = e.target as HTMLImageElement
            target.style.display = "none"
            const fallback = target.nextElementSibling as HTMLElement
            if (fallback) fallback.style.display = "flex"
          }}
        />
        <div className="hidden items-center justify-center w-full h-full text-4xl">
          ⚔️
        </div>
      </div>
    )
  }

  console.log("Rendering emoji avatar:", avatar)
  return (
    <div className={baseClasses}>
      {avatar}
    </div>
  )
}
