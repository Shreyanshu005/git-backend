import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.course.deleteMany(); // Clear existing courses

  // Make 8178785849 an admin
  const adminMobile = '8178785849';
  const adminName = 'Admin User';
  const existingAdmin = await prisma.user.findUnique({ where: { mobileNumber: adminMobile } });
  if (existingAdmin) {
    await prisma.user.update({ where: { mobileNumber: adminMobile }, data: { isAdmin: true } });
  } else {
    await prisma.user.create({ data: { name: adminName, mobileNumber: adminMobile, isVerified: true, isAdmin: true } });
  }

  await prisma.course.createMany({
    data: [
      {
        title: "KARAMSHILA GS FOUNDATION COURSE",
        subtitle: "UPSC CSE Foundation 2026",
        image: "/karam.png",
        startDate: "21 July",
        features: [
          "Available in Online Mode",
          "15 Months Validity",
          "800+ Hours of Classes",
          "Test Series, CSAT & Monthly Magazines"
        ],
        price: 19999,
        originalPrice: 34999,
        discount: 43,
      },
      {
        title: "GYANSHILA DRONA UPPCS FOUNDATION COURSE",
        subtitle: "UPPCS Foundation 2026",
        image: "/31.png",
        startDate: "21 July",
        features: [
          "Available in Online Mode",
          "12 Months Validity",
          "Pre+Mains Live & Recorded",
          "Test Series, CSAT & Monthly Magazines"
        ],
        price: 9999,
        originalPrice: 19999,
        discount: 50,
      },
      {
        title: "DHRUVSHILA KAUTILYA BPSC FOUNDATION COURSE",
        subtitle: "BPSC Foundation 2026",
        image: "/32.png",
        startDate: "21 July",
        features: [
          "Available in Online Mode",
          "12 Months Validity",
          "Pre+Mains Live & Recorded",
          "Test Series, CSAT & Monthly Magazines"
        ],
        price: 7999,
        originalPrice: 19999,
        discount: 60,
      },
      {
        title: "AADHARSHILA NCERT CONCEPT COURSE",
        subtitle: "UPSC CSE Foundation 2026",
        image: "/29.png",
        startDate: "21 July",
        features: [
          "Available in Online Mode",
          "6 Months Validity",
          "Comprehensive Syllabus Coverage",
          "Dedicated Doubt & Revisions Session"
        ],
        price: 9999,
        originalPrice: 19999,
        discount: 50,
      },
      {
        title: "UPPCS TEST SERIES",
        subtitle: "Preparation Booster Test Series for Batch 2025",
        image: "/UPPCS TEST DERIES.png",
        startDate: "21 July",
        features: [
          "Available in Online Mode",
          "15 Tests Included",
          "Validity Till Prelims Exam*",
          "360° Approach with Modal Answers"
        ],
        price: 1999,
        originalPrice: 6999,
        discount: 71,
      },
      {
        title: "BPSC TEST SERIES",
        subtitle: "Preparation Booster Test Series for Batch 2025",
        image: "/BPSC TEST SERIES.png",
        startDate: "21 July",
        features: [
          "Available in Online Mode",
          "15 Tests Included",
          "Validity Till Prelims Exam*",
          "360° Approach with Modal Answers"
        ],
        price: 1499,
        originalPrice: 4999,
        discount: 70,
      }
    ]
  });

  console.log('Courses seeded! Admin user set.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 