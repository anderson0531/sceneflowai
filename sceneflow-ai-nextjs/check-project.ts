import { Project } from './src/models/Project';
import { sequelize } from './src/config/database';

async function check() {
  await sequelize.authenticate();
  
  // Get the most recently created project
  const project = await Project.findOne({
    order: [['created_at', 'DESC']]
  });
  
  if (project) {
    console.log('Project ID:', project.id);
    console.log('Title:', project.title);
    console.log('Metadata keys:', Object.keys(project.metadata || {}));
    console.log('Has blueprintPrimeInput:', !!project.metadata?.blueprintPrimeInput);
    if (project.metadata?.blueprintPrimeInput) {
      console.log('blueprintPrimeInput length:', project.metadata.blueprintPrimeInput.length);
    }
  } else {
    console.log('No projects found');
  }
  
  process.exit(0);
}

check();
