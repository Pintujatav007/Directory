from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle, Image, KeepTogether, Flowable
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from pathlib import Path
import textwrap

ROOT = Path(__file__).parent.parent
OUT = ROOT / 'docs' / 'DevDirectory-Project-Guide-Updated.pdf'
OUT.parent.mkdir(exist_ok=True)
INK=HexColor('#25211e'); MUTED=HexColor('#6e6862'); BROWN=HexColor('#704b35'); TAN=HexColor('#efe5da'); BG=HexColor('#f7f4ee'); PAPER=HexColor('#fffefa'); GREEN=HexColor('#456c54'); LINE=HexColor('#ded8d0'); BLUE=HexColor('#3c6177')
styles=getSampleStyleSheet()
styles.add(ParagraphStyle(name='CoverTitle', parent=styles['Title'], fontName='Helvetica-Bold', fontSize=30, leading=36, textColor=INK, alignment=TA_LEFT, spaceAfter=8))
styles.add(ParagraphStyle(name='Lead', parent=styles['BodyText'], fontSize=12, leading=18, textColor=MUTED, spaceAfter=8))
styles.add(ParagraphStyle(name='H1x', parent=styles['Heading1'], fontName='Helvetica-Bold', fontSize=21, leading=26, textColor=INK, spaceBefore=3, spaceAfter=11))
styles.add(ParagraphStyle(name='H2x', parent=styles['Heading2'], fontName='Helvetica-Bold', fontSize=12, leading=16, textColor=BROWN, spaceBefore=7, spaceAfter=6))
styles.add(ParagraphStyle(name='Bodyx', parent=styles['BodyText'], fontSize=9.3, leading=14, textColor=INK, spaceAfter=6))
styles.add(ParagraphStyle(name='Smallx', parent=styles['BodyText'], fontSize=8, leading=11, textColor=MUTED, spaceAfter=4))
styles.add(ParagraphStyle(name='Captionx', parent=styles['BodyText'], fontSize=8.5, leading=12, textColor=MUTED, alignment=TA_CENTER, spaceBefore=4))
styles.add(ParagraphStyle(name='WhiteTitle', parent=styles['Title'], fontName='Helvetica-Bold', fontSize=20, leading=24, textColor=colors.white, alignment=TA_LEFT))

def P(txt, style='Bodyx'): return Paragraph(txt, styles[style])
def box(title, body, width=76*mm, fill=PAPER):
    t=Table([[P(title,'H2x')],[P(body,'Bodyx')]], colWidths=[width])
    t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),fill),('BOX',(0,0),(-1,-1),0.7,LINE),('LEFTPADDING',(0,0),(-1,-1),10),('RIGHTPADDING',(0,0),(-1,-1),10),('TOPPADDING',(0,0),(-1,-1),6),('BOTTOMPADDING',(0,0),(-1,-1),7)]))
    return t

def arrow(c,x1,y1,x2,y2,color=BROWN):
    c.setStrokeColor(color); c.setFillColor(color); c.setLineWidth(1.5); c.line(x1,y1,x2,y2)
    import math
    a=math.atan2(y2-y1,x2-x1); L=6
    p=c.beginPath(); p.moveTo(x2,y2); p.lineTo(x2-L*math.cos(a-.45),y2-L*math.sin(a-.45)); p.lineTo(x2-L*math.cos(a+.45),y2-L*math.sin(a+.45)); p.close()
    c.drawPath(p,fill=1,stroke=0)

def node(c,x,y,w,h,title,detail,fill=PAPER,stroke=LINE):
    c.setFillColor(fill); c.setStrokeColor(stroke); c.roundRect(x,y,w,h,9,fill=1,stroke=1)
    c.setFillColor(INK); c.setFont('Helvetica-Bold',9); c.drawCentredString(x+w/2,y+h-17,title)
    c.setFillColor(MUTED); c.setFont('Helvetica',7); lines=detail.split('\n')
    for i,line in enumerate(lines): c.drawCentredString(x+w/2,y+h-30-i*10,line)

def diagram_flow(c, doc):
    W,H=landscape(A4); left=25*mm
    c.setFillColor(INK); c.setFont('Helvetica-Bold',18); c.drawString(left,H-24*mm,'Product flow')
    c.setFillColor(MUTED); c.setFont('Helvetica',9); c.drawString(left,H-31*mm,'Main paths through the developer discovery experience')
    # Row 1
    xs=[left,left+49*mm,left+98*mm,left+147*mm]
    y=H-68*mm; w=40*mm; h=24*mm
    node(c,xs[0],y,w,h,'Visitor','Home / sign in',TAN)
    node(c,xs[1],y,w,h,'Discover','Search developers\nFilter by skills')
    node(c,xs[2],y,w,h,'Profile','Projects / skills\nGitHub repositories')
    node(c,xs[3],y,w,h,'Connect','Send request\nManage response')
    for i in range(3): arrow(c,xs[i]+w,y+h/2,xs[i+1]-2,y+h/2)
    # row two
    y2=H-121*mm
    node(c,xs[0],y2,w,h,'Job seeker','Create account\nBuild profile',TAN)
    node(c,xs[1],y2,w,h,'Interview prep','DSA / React / Java\nJS / HTML / CSS')
    node(c,xs[2],y2,w,h,'Career tools','Resume builder\nGitHub import')
    node(c,xs[3],y2,w,h,'Jobs','Search or post\nApply / connect')
    for i in range(3): arrow(c,xs[i]+w,y2+h/2,xs[i+1]-2,y2+h/2)
    node(c,left+55*mm,H-164*mm,86*mm,22*mm,'Workspace & assistant','Projects / tasks / goals / contextual developer help',HexColor('#edf2ed'),HexColor('#d7e3d8'))
    arrow(c,xs[1]+w/2,y2-2,left+77*mm,H-164*mm+22*mm,GREEN)
    arrow(c,xs[2]+w/2,y2-2,left+120*mm,H-164*mm+22*mm,GREEN)
    c.setFont('Helvetica',8); c.setFillColor(MUTED); c.drawString(left,H-177*mm,'Demo mode saves supported workspace data in the current browser. Connected mode uses the configured Supabase services.')

def diagram_arch(c, doc):
    W,H=landscape(A4); left=25*mm
    c.setFillColor(INK); c.setFont('Helvetica-Bold',18); c.drawString(left,H-24*mm,'Application architecture')
    c.setFillColor(MUTED); c.setFont('Helvetica',9); c.drawString(left,H-31*mm,'React client with optional managed backend services')
    y=H-83*mm; w=47*mm; h=40*mm; gap=9*mm
    nodes=[('Presentation','React + TypeScript\nReact Router / Lucide',TAN),('Application','Pages & features\nZod validation\nInterview quiz'),('Data access','Supabase JS client\nGitHub public API\nLocal demo storage'),('Services','Supabase Auth\nPostgres + RLS\nPrivate Storage'),('Server function','AI Edge Function\nRequest validation\nRate limiting')]
    coords=[]
    for i,(title,detail,fill) in enumerate(nodes):
        x=left+i*(w+gap); node(c,x,y,w,h,title,detail,fill); coords.append(x)
    for i in range(4): arrow(c,coords[i]+w,y+h/2,coords[i+1]-2,y+h/2)
    node(c,left+4*(w+gap),H-142*mm,47*mm,30*mm,'AI provider','Server-side secret only',HexColor('#f6ece7'),HexColor('#e8d5c9'))
    arrow(c,coords[4]+w/2,y-2,left+4*(w+gap)+w/2,H-142*mm+30*mm,BLUE)
    node(c,left+50*mm,H-142*mm,56*mm,30*mm,'Browser localStorage','Guest/demo data\nQuiz personal best',HexColor('#edf2ed'),HexColor('#d7e3d8'))
    arrow(c,coords[2]+w/2,y-2,left+78*mm,H-142*mm+30*mm,GREEN)
    c.setFillColor(MUTED); c.setFont('Helvetica',8); c.drawString(left,H-158*mm,'Secrets remain server-side. Supabase policies define access to shared accounts and records when project credentials are configured.')

def footer(c, doc):
    c.saveState(); W,H=doc.pagesize
    c.setStrokeColor(LINE); c.line(18*mm,14*mm,W-18*mm,14*mm)
    c.setFont('Helvetica',7.5); c.setFillColor(MUTED); c.drawString(18*mm,9*mm,'DEVDIRECTORY  /  PROJECT GUIDE')
    c.drawRightString(W-18*mm,9*mm,str(doc.page)); c.restoreState()

class Diagram(Flowable):
    def __init__(self, kind): self.kind=kind; self.width=174*mm; self.height=112*mm
    def wrap(self, aw, ah): return self.width, self.height
    def draw(self):
        c=self.canv
        def card(x,y,w,h,title,detail,fill=BG):
            c.setFillColor(fill); c.setStrokeColor(LINE); c.roundRect(x,y,w,h,8,fill=1,stroke=1)
            c.setFillColor(INK); c.setFont('Helvetica-Bold',8.5); c.drawCentredString(x+w/2,y+h-17,title)
            c.setFillColor(MUTED); c.setFont('Helvetica',7)
            for i,line in enumerate(detail.split('\n')): c.drawCentredString(x+w/2,y+h-29-i*9,line)
        def link(x1,y1,x2,y2):
            c.setStrokeColor(BROWN); c.setFillColor(BROWN); c.setLineWidth(1.3); c.line(x1,y1,x2,y2)
            import math
            a=math.atan2(y2-y1,x2-x1); L=5; p=c.beginPath(); p.moveTo(x2,y2); p.lineTo(x2-L*math.cos(a-.5),y2-L*math.sin(a-.5)); p.lineTo(x2-L*math.cos(a+.5),y2-L*math.sin(a+.5)); p.close(); c.drawPath(p,fill=1,stroke=0)
        if self.kind=='flow':
            row=[('Visitor','Home / sign in'),('Discover','Search and filter'),('Profile','Skills / projects'),('Connect','Request / reply')]
            xs=[0,132,264,396]; y=158; w=98; h=50
            for i,(a,b) in enumerate(row): card(xs[i],y,w,h,a,b,TAN if i==0 else PAPER)
            for i in range(3): link(xs[i]+w,y+h/2,xs[i+1]-3,y+h/2)
            row2=[('Member space','Profile / projects'),('Interview prep','6 topics / 30 MCQs'),('Career tools','Resume / GitHub'),('Jobs','Search / post')]
            y=67
            for i,(a,b) in enumerate(row2): card(xs[i],y,w,h,a,b,HexColor('#edf2ed') if i==0 else PAPER)
            for i in range(3): link(xs[i]+w,y+h/2,xs[i+1]-3,y+h/2)
            link(49,155,49,122); link(181,155,181,122); link(313,155,313,122)
            c.setFillColor(MUTED); c.setFont('Helvetica',7.5); c.drawString(0,34,'Main flow: discover developers and collaborate, or use career preparation and job tools.')
        else:
            card(0,176,155,55,'React client','React + TypeScript\nVite / React Router',TAN)
            card(169,176,155,55,'Feature pages','Discovery / workspace\nMCQ / jobs / assistant')
            card(338,176,155,55,'Data adapters','Supabase client\nGitHub public API')
            link(155,203,166,203); link(324,203,335,203)
            card(0,85,155,55,'Browser storage','Guest/demo data\nQuiz personal best',HexColor('#edf2ed'))
            card(169,85,155,55,'Supabase services','Auth / Postgres\nRLS / private storage')
            card(338,85,155,55,'Edge function','Validated AI requests\nRate limit / server secret',HexColor('#f6ece7'))
            link(415,173,77,143); link(415,173,246,143); link(415,82,415,62)
            card(338,7,155,48,'AI provider','Called server-side only',PAPER)
            c.setFillColor(MUTED); c.setFont('Helvetica',7.5); c.drawString(0,34,'The browser never receives the AI provider secret. Configure Supabase to enable shared backend features.')

def mock_screen(path, mode):
    # A clean visual mockup based on the React app's warm ivory/espresso theme.
    from PIL import Image as PILImage, ImageDraw, ImageFont
    W,H=1440,900; im=PILImage.new('RGB',(W,H),'#f7f4ee'); d=ImageDraw.Draw(im)
    def font(size,bold=False):
        f='C:/Windows/Fonts/arialbd.ttf' if bold else 'C:/Windows/Fonts/arial.ttf'
        return ImageFont.truetype(f,size)
    d.rectangle((0,0,250,H),fill='#fffefa'); d.line((249,0,249,H),fill='#e9e1d7',width=2)
    d.rounded_rectangle((28,26,64,62),radius=11,fill='#704b35'); d.text((38,33),'D',font=font(19,True),fill='white')
    d.text((76,28),'devdirectory.',font=font(21,True),fill='#30251e'); d.text((77,53),'BUILD TOGETHER',font=font(9,True),fill='#82766b')
    nav=['Overview','Developers','Project board','Learning goals','Interview MCQs','Memory assistant','Posts & links','Resume builder','Home settings','Admin panel','My portfolio']
    for i,n in enumerate(nav):
        y=112+i*42
        if (mode=='quiz' and n=='Interview MCQs') or (mode=='memory' and n=='Memory assistant'):
            d.rounded_rectangle((18,y-7,231,y+33),radius=10,fill='#f2ece3')
        d.text((35,y),['◫','♙','▣','◉','✓','✦','▤','▧','⚙','♜','◇'][i],font=font(15,True),fill='#704b35')
        d.text((63,y+2),n,font=font(11,True),fill='#75695e')
    d.rectangle((250,0,W,72),fill='#f7f4ee'); d.line((250,71,W,71),fill='#e9e1d7',width=1)
    d.text((295,28),'Workspace   /   '+('Interview MCQs' if mode=='quiz' else 'Memory assistant'),font=font(13),fill='#82766b')
    if mode=='memory':
        d.text((295,117),'YOUR PERSONAL PROJECT NOTEBOOK',font=font(11,True),fill='#8e6548')
        d.text((295,148),'Tell me what’s on your mind.',font=font(34,True),fill='#30251e')
        d.text((295,203),'Save a problem, idea, or decision. Ask about it later and find',font=font(14),fill='#82766b')
        d.text((295,226),'the note again.',font=font(14),fill='#82766b')
        d.rounded_rectangle((1190,200,1360,230),radius=12,fill='#f2ece5'); d.text((1205,208),'Saved in this browser',font=font(9,True),fill='#704b35')
        d.rounded_rectangle((295,270,950,815),radius=15,fill='#fffefa',outline='#e9e1d7',width=2)
        d.text((320,292),'Ask your memory assistant',font=font(17,True),fill='#30251e')
        d.rounded_rectangle((320,333,920,385),radius=10,fill='#fffefa',outline='#e9e1d7'); d.text((336,352),'What was the bug I had with login?',font=font(13),fill='#82766b')
        d.rounded_rectangle((320,399,920,446),radius=9,fill='#704b35'); d.text((505,414),'Search my saved notes  ->',font=font(13,True),fill='white')
        d.rounded_rectangle((320,461,920,518),radius=11,fill='#f5f0e9',outline='#e9e1d7'); d.text((338,482),'Your saved notes will appear here.',font=font(12),fill='#75695e')
        d.line((320,545,920,545),fill='#e9e1d7',width=2); d.text((320,567),'Save a problem or idea',font=font(17,True),fill='#30251e')
        d.text((320,606),'What should I remember?',font=font(11,True),fill='#82766b')
        d.rounded_rectangle((320,628,920,711),radius=10,fill='#fffefa',outline='#e9e1d7'); d.text((338,647),'Describe the problem, what you tried, and what worked…',font=font(11),fill='#82766b')
        d.rounded_rectangle((320,730,920,775),radius=9,fill='#704b35'); d.text((514,743),'Save this note',font=font(13,True),fill='white')
        d.rounded_rectangle((980,270,1360,815),radius=15,fill='#fffefa',outline='#e9e1d7',width=2)
        d.text((1005,292),'Saved notes',font=font(17,True),fill='#30251e'); d.text((1325,294),'1',font=font(11),fill='#82766b')
        d.rounded_rectangle((1005,332,1335,470),radius=12,fill='#fffefa',outline='#e9e1d7'); d.text((1022,351),'Login redirect issue',font=font(12,True),fill='#30251e'); d.text((1022,382),'Reset the callback URL and clear the',font=font(11),fill='#82766b'); d.text((1022,400),'old local session. Retest signup.',font=font(11),fill='#82766b'); d.text((1022,435),'react   ·   login',font=font(10,True),fill='#704b35')
    else:
        d.text((295,110),'INTERVIEW PRACTICE',font=font(11,True),fill='#8e6548')
        d.text((295,142),'Prepare with purpose.',font=font(36,True),fill='#30251e')
        d.text((295,198),'Practice screening topics, check your reasoning, and build confidence.',font=font(14),fill='#82766b')
        topics=['DSA','React','Java','JavaScript','HTML','CSS']
        for i,t in enumerate(topics):
            x=295+i*145; d.rounded_rectangle((x,254,x+132,304),radius=10,fill='#704b35' if t=='DSA' else '#fffefa',outline='#e9e1d7')
            d.text((x+14,263),t,font=font(13,True),fill='white' if t=='DSA' else '#704b35'); d.text((x+14,283),'5 questions',font=font(9),fill='#efe4d7' if t=='DSA' else '#82766b')
        d.rounded_rectangle((295,332,575,680),radius=16,fill='#fffefa',outline='#e9e1d7',width=2)
        d.text((320,354),'JOB SCREENING PREP',font=font(10,True),fill='#8e6548'); d.text((320,382),'DSA fundamentals',font=font(20,True),fill='#30251e')
        d.text((320,425),'QUESTION SET',font=font(9,True),fill='#82766b'); d.text((320,445),'5 questions',font=font(13,True),fill='#30251e')
        d.text((320,492),'YOUR SCORE',font=font(9,True),fill='#82766b'); d.text((320,512),'0 correct so far',font=font(13,True),fill='#30251e')
        d.rounded_rectangle((320,580,535,622),radius=9,fill='#fffefa',outline='#e9e1d7'); d.text((345,593),'Restart set',font=font(12,True),fill='#704b35')
        d.rounded_rectangle((600,332,1360,680),radius=16,fill='#fffefa',outline='#e9e1d7',width=2)
        d.text((632,360),'DSA     QUESTION 1 / 5',font=font(10,True),fill='#8e6548')
        d.rounded_rectangle((632,389,1325,394),radius=3,fill='#efe4d7'); d.rounded_rectangle((632,389,690,394),radius=3,fill='#704b35')
        d.text((632,425),'What is the time complexity of binary search',font=font(19,True),fill='#30251e'); d.text((632,453),'on a sorted array?',font=font(19,True),fill='#30251e')
        opts=['O(n)','O(log n)','O(n log n)','O(1)']
        for i,o in enumerate(opts):
            y=505+i*39; d.rounded_rectangle((632,y,1325,y+31),radius=7,fill='#fffefa',outline='#e9e1d7'); d.text((650,y+8),chr(65+i)+'.   '+o,font=font(12),fill='#30251e')
    im.save(path)

mock_screen(ROOT/'docs'/'screenshots'/'memory-assistant-preview.png','memory')
mock_screen(ROOT/'docs'/'screenshots'/'interview-prep-preview.png','quiz')

story=[]
story += [Spacer(1,12*mm),P('DEVDIRECTORY','CoverTitle'),P('Project flow, architecture & interface guide','Lead'),Spacer(1,6*mm)]
intro=Table([[P('<b>A React + TypeScript developer discovery platform</b><br/><br/>This guide maps the main user journeys, describes the application architecture, and shows representative interface previews. The project includes developer discovery, profiles, jobs, interview practice, resume tools, workspace features, and an assistant.','Bodyx')]],colWidths=[174*mm]); intro.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),TAN),('BOX',(0,0),(-1,-1),0.8,LINE),('LEFTPADDING',(0,0),(-1,-1),15),('RIGHTPADDING',(0,0),(-1,-1),15),('TOPPADDING',(0,0),(-1,-1),15),('BOTTOMPADDING',(0,0),(-1,-1),15)])); story += [intro,Spacer(1,9*mm),P('At a glance','H2x')]
rows=[[P('<b>Frontend</b>','Bodyx'),P('<b>React 18 / TypeScript / Vite / React Router</b>','Bodyx')],[P('<b>UI</b>','Bodyx'),P('Responsive ivory / espresso visual system / Lucide icons','Bodyx')],[P('<b>Data modes</b>','Bodyx'),P('Browser local demo mode or optional Supabase-connected mode','Bodyx')],[P('<b>Interview prep</b>','Bodyx'),P('30 questions across DSA, React, Java, JavaScript, HTML, and CSS','Bodyx')],[P('<b>Entry point</b>','Bodyx'),P('main.tsx -> App.tsx -> routed pages / features','Bodyx')]]
t=Table(rows,colWidths=[40*mm,134*mm]); t.setStyle(TableStyle([('BACKGROUND',(0,0),(0,-1),BG),('GRID',(0,0),(-1,-1),0.4,LINE),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),8),('RIGHTPADDING',(0,0),(-1,-1),8),('TOPPADDING',(0,0),(-1,-1),5),('BOTTOMPADDING',(0,0),(-1,-1),4)])); story += [t,Spacer(1,8*mm),P('Project folder: DevDirectory-React-Project. Start locally with <b>npm install</b> followed by <b>npm run dev</b>.','Smallx'),PageBreak()]
story += [P('1. Product flow','H1x'),P('The app supports both discovery and career preparation. A visitor can browse public developer profiles, while signed-in members manage their own profile, projects, jobs, and workspace.','Bodyx'),Diagram('flow'),PageBreak()]
story += [P('2. Architecture','H1x'),P('The React client handles routing, forms, validation, and the interface. When configured, Supabase provides authentication, shared records, row-level security, and private resume storage. The AI Edge Function keeps provider credentials on the server.','Bodyx'),Spacer(1,4*mm),Diagram('architecture'),Spacer(1,3*mm)]
story += [P('Key source files','H2x')]
files=[('App.tsx','Routes, account state, navigation, and primary page composition.'),('Practice.tsx / practice.css','Interview MCQ bank, topic selection, answers, explanations, score, and personal best.'),('Features.tsx / features.css','Jobs, admin, career tools, and assistant features.'),('Workspace.tsx / workspace.css','Project board, tasks, goals, and activity.'),('supabase-client.ts','Optional frontend Supabase client configuration.'),('database-schema.sql','Database tables, policies, and private storage setup.'),('developer-assistant-function.ts','Server-side assistant function source.')]
for name,desc in files: story.append(P(f'<b>{name}</b> - {desc}','Bodyx'))
story += [Spacer(1,3*mm),P('Demo mode vs connected mode','H2x'),P('Without Supabase credentials, the app uses local browser storage for supported demo data; that data stays in the current browser. With Supabase configured, authenticated features use the backend policies described in the project schema. GitHub profile/repository lookup uses public GitHub information.','Bodyx'),PageBreak()]
story += [P('3. Interface previews','H1x'),P('Representative screen previews following the warm white and brown design. The memory assistant saves and searches notes locally; interview practice includes six topics, explanations, and personal-best scores.','Bodyx')]
for fn,cap in [('memory-assistant-preview.png','Memory assistant with searchable local notes'),('interview-prep-preview.png','Interview practice with topic selector and question options')]:
    story += [Image(str(ROOT/'docs'/'screenshots'/fn),width=150*mm,height=93.75*mm),P(cap,'Captionx'),Spacer(1,3*mm)]
story += [PageBreak(),P('4. Run and publish','H1x'),P('<b>Run locally</b>','H2x'),P('Open the DevDirectory-React-Project folder in VS Code, open a terminal in that folder, then run:<br/><br/><font name="Courier">npm install<br/>npm run dev</font>','Bodyx'),P('<b>Build for hosting</b>','H2x'),P('Run <font name="Courier">npm run build</font>. The deployable frontend output is the generated <font name="Courier">dist/</font> folder. For a static Netlify or GitHub Pages deployment, use the Vite build output and configure SPA fallback routing. Supabase-backed features also require production environment variables, database setup, and the Edge Function deployment described in README.md.','Bodyx'),P('<b>Interview practice route</b>','H2x'),P('Open <font name="Courier">/interview-prep</font> in the app. Pick DSA, React, Java, JavaScript, HTML, or CSS. Select an answer to see the explanation, finish the 5-question set, then restart or switch topics.','Bodyx'),P('<b>Project notes</b>','H2x'),P('The included seeded developers and example content are demonstration data. The repository README documents Supabase setup, environment configuration, and features that require backend credentials.','Bodyx')]

doc=SimpleDocTemplate(str(OUT),pagesize=A4,rightMargin=18*mm,leftMargin=18*mm,topMargin=17*mm,bottomMargin=20*mm,title='DevDirectory Project Guide',author='DevDirectory')
doc.build(story,onFirstPage=footer,onLaterPages=footer)
print(OUT)



