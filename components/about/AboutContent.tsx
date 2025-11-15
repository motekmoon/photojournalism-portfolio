'use client';

import ReactMarkdown from 'react-markdown';
import { CldImage } from 'next-cloudinary';

interface AboutContentProps {
  content: string;
  profileImagePublicId: string | null;
}

export default function AboutContent({ content, profileImagePublicId }: AboutContentProps) {
  if (!content || content.trim() === '') {
    return (
      <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 items-start py-12">
        {profileImagePublicId && profileImagePublicId.trim() !== '' && (
          <div className="flex-shrink-0">
            <div className="relative rounded-full overflow-hidden bg-gray-100 border-4 border-gray-200" style={{ width: '192px', height: '192px' }}>
              <CldImage
                src={profileImagePublicId}
                alt="Profile"
                width={192}
                height={192}
                className="object-cover rounded-full"
              />
            </div>
          </div>
        )}
        <div className="flex-1">
          <p className="text-gray-500">No content available yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="markdown-content">
      <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 items-start sm:items-start">
        {profileImagePublicId && profileImagePublicId.trim() !== '' && (
          <div className="flex-shrink-0 self-start">
            <div className="relative rounded-full overflow-hidden bg-gray-100 border-4 border-gray-200" style={{ width: '192px', height: '192px' }}>
              <CldImage
                src={profileImagePublicId}
                alt="Profile"
                width={192}
                height={192}
                className="object-cover rounded-full"
              />
            </div>
          </div>
        )}
        <div className="flex-1 min-w-0 self-start">
          <div className="[&>h1:first-child]:mt-0 [&>p:first-child]:mt-0">
            <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <h1 className="text-4xl font-bold text-gray-900 mt-8 mb-4">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-3xl font-semibold text-gray-900 mt-6 mb-3">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-2xl font-semibold text-gray-900 mt-5 mb-2">{children}</h3>
          ),
          p: ({ children }) => {
            // Convert plain email addresses to mailto links
            const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/g;
            
            if (typeof children === 'string') {
              const parts = children.split(emailRegex);
              const processedChildren = parts.map((part, index) => {
                // Check if part matches email pattern
                if (/^[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+$/.test(part)) {
                  return (
                    <a
                      key={index}
                      href={`mailto:${part}`}
                      className="text-gray-900 underline underline-offset-2 hover:text-gray-600 cursor-pointer"
                    >
                      {part}
                    </a>
                  );
                }
                return part;
              });
              return (
                <p className="text-sm text-gray-700 mb-4 leading-relaxed">{processedChildren}</p>
              );
            }
            
            return (
              <p className="text-sm text-gray-700 mb-4 leading-relaxed">{children}</p>
            );
          },
          a: ({ href, children }) => {
            // Check if it's an email address
            const isEmail = href?.includes('@') && !href?.startsWith('http');
            const mailtoHref = isEmail ? `mailto:${href}` : href;
            
            return (
              <a
                href={mailtoHref}
                className="text-gray-900 underline underline-offset-2 hover:text-gray-600 cursor-pointer"
                target={href?.startsWith('http') ? '_blank' : undefined}
                rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
              >
                {children}
              </a>
            );
          },
          ul: ({ children }) => (
            <ul className="list-disc list-inside text-sm text-gray-700 my-4 space-y-2 pl-6">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside text-sm text-gray-700 my-4 space-y-2 pl-6">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="text-sm leading-relaxed">{children}</li>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-gray-900">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic">{children}</em>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-gray-300 pl-4 my-6 text-gray-600 italic">
              {children}
            </blockquote>
          ),
          code: ({ children, className }) => {
            const isInline = !className;
            return isInline ? (
              <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm text-gray-900 font-mono">
                {children}
              </code>
            ) : (
              <code className="block bg-gray-100 p-4 rounded-lg overflow-x-auto text-sm text-gray-900 font-mono my-6">
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto my-6">{children}</pre>
          ),
          img: ({ src, alt }) => (
            <img
              src={src || ''}
              alt={alt || ''}
              className="max-w-full h-auto my-6 rounded-lg"
            />
          ),
          hr: () => (
            <hr className="border-0 border-t border-gray-300 my-8" />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}

