const express = require('express');
const fs = require('fs');
const pdf = require('pdfkit');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(__dirname));
const PORT = 3000;

class PriorityQueue {
    constructor() {
        this.items = [];
    }

    enqueue(element, priority) {
        const complaint = { element, priority };
        let added = false;

        for (let i = 0; i < this.items.length; i++) {
            if (this.items[i].priority > priority) {
                this.items.splice(i, 0, complaint);
                added = true;
                break;
            }
        }

        if (!added) {
            this.items.push(complaint);
        }
    }

    dequeue() {
        return this.items.shift();
    }

    isEmpty() {
        return this.items.length === 0;
    }
}

const complaintsQueue = [];
const priorityQueue = new PriorityQueue();

const saveToCSV = (complaint) => {
    const csvLine = `${complaint.id},${complaint.name},${complaint.phone},${complaint.location},${complaint.description},${complaint.priority},${complaint.status}\n`;
    fs.appendFile('complaints.csv', csvLine, (err) => {
        if (err) console.error('Error saving to CSV:', err);
    });
};

const generatePDF = (complaint) => {
    const doc = new pdf();
    const filePath = path.join(__dirname, `confirmation_${complaint.id}.pdf`);
    doc.pipe(fs.createWriteStream(filePath));
    doc.text(`Complaint ID: ${complaint.id}`);
    doc.text(`Name: ${complaint.name}`);
    doc.text(`Phone: ${complaint.phone}`);
    doc.text(`Location: ${complaint.location}`);
    doc.text(`Description: ${complaint.description}`);
    doc.text(`Priority: ${complaint.priority}`);
    doc.text(`Status: ${complaint.status}`);
    doc.end();
};

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/report', (req, res) => {
    const { name, phone, location, description, priority } = req.body;
    const complaint = {
        id: Date.now(),
        name,
        phone,
        location,
        description,
        priority,
        status: 'Pending'
    };
    complaintsQueue.push(complaint);
    saveToCSV(complaint);
    generatePDF(complaint);
    res.status(201).json({ message: 'Complaint registered!', complaint });
});

app.post('/report-priority', (req, res) => {
    const { name, phone, location, description, priority } = req.body;
    priorityQueue.enqueue({ name, phone, location, description, status: 'Pending' }, priority);
    res.status(201).json({ message: 'Complaint added with priority!', complaint: { name, phone, location, description, priority } });
});

app.get('/complaints', (req, res) => {
    res.status(200).json(complaintsQueue);
});

app.get('/status/:id', (req, res) => {
    const complaintId = parseInt(req.params.id);
    const complaint = complaintsQueue.find(c => c.id === complaintId);

    if (!complaint) {
        return res.status(404).json({ message: 'Complaint not found' });
    }
    res.json({ message: 'Complaint status fetched', status: complaint.status });
});

app.post('/resolve/:id', (req, res) => {
    const complaintId = parseInt(req.params.id);
    const complaintIndex = complaintsQueue.findIndex(c => c.id === complaintId);

    if (complaintIndex === -1) {
        return res.status(404).json({ message: 'Complaint not found' });
    }

    complaintsQueue[complaintIndex].status = 'Resolved';
    saveToCSV(complaintsQueue[complaintIndex]);
    res.json({ message: 'Complaint resolved', complaint: complaintsQueue[complaintIndex] });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
