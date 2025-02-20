import React, { useEffect, useState } from "react";


export default function IntervewControl(props) {
  const [jobDescription, setJobDescription] = useState("");
  const [uploadedFile, setUploadedFile] = useState(null);
  const [selectedRole, setSelectedRole] = useState("pm"); 
  const [resumeText, setResumeText] = useState(null);

  const roles = {
    pm: "Product Manager",
    developer: "Senior Developer",
    teamlead: "Team Lead",
  }

  const userData = props.userData.current;
  useEffect(() => {
    userData.role = selectedRole;
    userData.job_description = jobDescription;
    userData.cv = uploadedFile;
    userData.resumeText = resumeText;
  }, [jobDescription, uploadedFile, selectedRole, resumeText]);
  userData.role = selectedRole;

  // Handle file upload
  const handleFileUpload = (e) => {
      const file = e.target.files?.[0];
      if (file && file.type === "application/pdf") {
          setUploadedFile(file);
          
          const formData = new FormData();
          formData.append('pdf', file);
          fetch(`/upload`, {
            method: "POST",
            body: formData
          })
          .then(async (response) => {
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let result = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                result += decoder.decode(value, { stream: true });
            }
            setResumeText(result);
          })
          .catch((error) => console.error("Fetch Error:", error));
      } else {
          alert("Please upload a valid PDF file.");
      }
  };

  // Handle file download
  const handleDownload = () => {
      if (uploadedFile) {
          const fileURL = URL.createObjectURL(uploadedFile);
          const link = document.createElement("a");
          link.href = fileURL;
          link.download = uploadedFile.name || "downloaded-cv.pdf";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(fileURL); // Clean up the URL object
      }
  };

  return (
    <div className="h-full bg-gray-50 rounded-md p-4 gap-y-12">
        <h2 className="text-lg font-bold mb-2">Interview Params</h2>
        <p>Role</p>
        <select 
            className="border border-gray-200 rounded-md p-2 w-full mb-4"
            value={selectedRole} // ...force the select's value to match the state variable...
            onChange={e => setSelectedRole(e.target.value)} 
        >
            {Object.entries(roles).map(([value, label]) => (
                <option key={value} value={value}>
                {label}
                </option>
            ))}            
        </select>
        <p>Job Description</p>
        <div className="flex  justify-center w-full mb-4">
            <textarea
            onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && jobDescription.trim()) {
                // handleSendClientEvent();
                }
            }}
            type="text"
            placeholder="Paste here job description..."
            className="border border-gray-200 rounded-md p-4 flex-1"
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            rows={10}
            />
        </div>
        <div>
            <label className="cursor-pointer bg-blue-500 text-white rounded-md px-4 py-2 hover:bg-blue-600">
                <span>Upload CV (PDF)</span>
                <input
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={handleFileUpload}
                />                
            </label>
            {resumeText !== null ? (
            <button
                onClick={handleDownload}
                className="ml-4 text-blue-600 underline"
            >
                File...
            </button>
            ) : <div/>}
        </div>
    </div>);
}
