const ACCEPT=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.txt,.rtf,.odt,.ods,.odp,.jpg,.jpeg,.png,.webp,.gif,.mp4,.mov,.webm,.mp3,.wav,.m4a,.zip";

export default function DocumentUpload({label="Supporting documents",required=false,multiple=true,compact=false}:{label?:string;required?:boolean;multiple?:boolean;compact?:boolean}){
  return <label className={`document-upload${compact?" document-upload--compact":""}`}>
    <span><b>⇧ {label}</b><small>PDF, Office files, text, images, media, or ZIP · 25 MB maximum per file</small></span>
    <input type="file" name="documents" accept={ACCEPT} required={required} multiple={multiple}/>
  </label>;
}
