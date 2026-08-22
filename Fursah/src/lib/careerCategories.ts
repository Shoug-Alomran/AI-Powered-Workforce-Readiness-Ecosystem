export function careerCategoryFor(label: string) {
  if (/software|developer|comput|data|cyber|network|cloud|artificial|machine|information|systems|devops|programm|web|mobile|quality assurance/i.test(label)) return "Computing & Information Technology";
  if (/financial|finance|account|business|market|economic|management|manager|human resource|supply|bank|invest|audit|sales|entrepreneur/i.test(label)) return "Business & Finance";
  if (/design|ux|ui|creative|media|graphic|architecture|content|brand|animation|photograph/i.test(label)) return "Design & Creative";
  if (/health|medical|nurs|pharma|clinical|public health|biomed|laborator|nutrition|therap/i.test(label)) return "Health & Life Sciences";
  if (/engineer|mechanical|electrical|civil|industrial|chemical|robotic|energy|manufactur/i.test(label)) return "Engineering";
  if (/law|legal|policy|government|public administration|complian|regulat|governance|diplomat/i.test(label)) return "Law & Public Policy";
  if (/education|teach|academic|curriculum|instructional|train|learning/i.test(label)) return "Education";
  if (/tourism|hotel|hospitality|event|travel|guest/i.test(label)) return "Tourism & Hospitality";
  if (/energy|renewable|sustainab|environment|solar|water/i.test(label)) return "Energy & Sustainability";
  if (/logistics|transport|aviation|airport|fleet|warehouse/i.test(label)) return "Logistics & Transport";
  if (/media|communication|journal|public relations|broadcast/i.test(label)) return "Media & Communications";
  if (/agricultur|food|agronom|quality control/i.test(label)) return "Agriculture & Food";
  if (/scientist|research|chemist|physic|laboratory/i.test(label)) return "Science & Research";
  if (/real estate|property|construction|quantity survey|urban plan/i.test(label)) return "Construction & Real Estate";
  if (/sport|fitness|entertainment|game producer/i.test(label)) return "Sports & Entertainment";
  return "Other fields";
}
