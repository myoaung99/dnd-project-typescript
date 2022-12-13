//* Validation
interface Validatable {
  value: string | number;
  require?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
}

interface ValidatableFn {
  (validatableValue: Validatable): boolean;
}

enum ProjectStatus {
  Active,
  Finished,
}

//? validation function
const validate: ValidatableFn = (validatableValue) => {
  let isValid = true;
  //? check required
  if (validatableValue.require) {
    isValid = isValid && validatableValue.value.toString().length !== 0;
  }
  //? check string min length
  if (
    validatableValue.minLength != null &&
    typeof validatableValue.value === "string"
  ) {
    isValid =
      isValid &&
      validatableValue.value.trim().length >= validatableValue.minLength;
  }

  if (
    validatableValue.maxLength != null &&
    typeof validatableValue.value === "string"
  ) {
    isValid =
      isValid &&
      validatableValue.value.trim().length <= validatableValue.maxLength;
  }

  if (
    validatableValue.min != null &&
    typeof validatableValue.value === "number"
  ) {
    isValid = isValid && validatableValue.value >= validatableValue.min;
  }

  if (
    validatableValue.max != null &&
    typeof validatableValue.value === "number"
  ) {
    isValid = isValid && validatableValue.value <= validatableValue.max;
  }

  return isValid;
};

//? method decorator
function BindToClass(
  _: any,
  _2: string | symbol,
  descriptor: PropertyDescriptor
) {
  const originalFunc = descriptor.value;
  const adjustFun: PropertyDescriptor = {
    configurable: true,
    get() {
      return originalFunc.bind(this);
    },
  };

  return adjustFun;
}

class Project {
  constructor(
    public id: string,
    public title: string,
    public description: string,
    public numberOfPeople: number,
    public status: ProjectStatus
  ) {}
}

type Listener<T> = (projects: T[]) => void;

//? base state component
abstract class State<T> {
  protected listeners: Listener<T>[] = [];
  abstract addListener(listener: Listener<T>): void;
}

//? project Global State
class ProjectState extends State<Project> {
  private static instance: ProjectState;
  //? attaching listeners and calling callback listener at data changes is
  //? subscribe pattern
  private projects: Project[] = [];

  private constructor() {
    super();
  }

  addListener(listener: Listener<Project>): void {
    this.listeners.push(listener);
  }

  //? checking and return the same instance is
  //? singleton pattern ----------->
  public static getInstance() {
    if (this.instance) {
      return this.instance;
    } else {
      this.instance = new ProjectState();
      return this.instance;
    }
  }

  public addProject(title: string, desc: string, numberOfPeople: number) {
    const newProject = new Project(
      Math.random().toString(),
      title,
      desc,
      numberOfPeople,
      ProjectStatus.Active
    );
    this.projects.push(newProject);

    //? subscribing the listener
    for (const listener of this.listeners) {
      listener(this.projects.slice());
    }
  }
}

const projectState = ProjectState.getInstance();

//* base project component
//* abstract class cannot create instance
//* one of abstract class's job is for extending
abstract class Component<T extends HTMLElement, U extends HTMLElement> {
  templateElement: HTMLTemplateElement;
  containerElement: T;
  element: U;

  constructor(
    templateId: string,
    containerId: string,
    insertAtStart: boolean,
    newElementId?: string
  ) {
    this.templateElement = document.getElementById(
      templateId
    )! as HTMLTemplateElement;
    this.containerElement = document.getElementById(containerId)! as T;

    const importedElement = document.importNode(
      this.templateElement.content,
      true
    );

    this.element = importedElement.firstElementChild as U;
    if (newElementId) {
      this.element.id = newElementId;
    }

    this.attachForm(insertAtStart);
  }

  private attachForm(insertAtBeginning: boolean) {
    this.containerElement.insertAdjacentElement(
      insertAtBeginning ? "afterbegin" : "beforeend",
      this.element
    );
  }

  abstract configure(): void;
  abstract renderContent(): void;
}

class ProjectItem extends Component<HTMLUListElement, HTMLLIElement> {
  private project: Project;
  constructor(containerId: string, project: Project) {
    super("single-project", containerId, false, project.id);
    this.project = project;

    this.renderContent();
  }

  configure(): void {}

  renderContent(): void {
    this.element.querySelector("h2")!.textContent = this.project.title;
    this.element.querySelector("h3")!.textContent =
      this.project.numberOfPeople.toString() + " team members";
    this.element.querySelector("p")!.textContent = this.project.description;
  }
}

class ProjectList extends Component<HTMLDivElement, HTMLElement> {
  assignedProjects: Project[];

  constructor(private type: "active" | "finished") {
    super("project-list", "app", false, `${type}-projects`);

    //* initial empty projects
    this.assignedProjects = [];

    projectState.addListener((projects: Project[]) => {
      let relevantProject: Project[] = [];

      //* filter out the projects based on status props
      relevantProject = projects.filter((project) => {
        if (this.type === "active") {
          return project.status === ProjectStatus.Active;
        }
        return project.status === ProjectStatus.Finished;
      });
      this.assignedProjects = relevantProject;

      this.renderProject();
    });

    this.renderContent();
  }

  configure(): void {}

  renderContent(): void {
    this.element.querySelector("ul")!.id = `${this.type}-projects-list`;
    this.element.querySelector("h2")!.textContent = (
      this.type + " projects"
    ).toUpperCase();
  }

  private renderProject(): void {
    //* clear previous li nodes
    document.querySelector(`#${this.type}-projects-list`)!.innerHTML = "";

    //* append the list item to ul
    for (const projectItem of this.assignedProjects) {
      new ProjectItem(`${this.type}-projects-list`, projectItem);
    }
  }
}

class ProjectForm extends Component<HTMLDivElement, HTMLFormElement> {
  titleInputElement: HTMLInputElement;
  descriptionInputElement: HTMLInputElement;
  peopleInputElement: HTMLInputElement;

  constructor() {
    super("project-input", "app", true, "user-input");

    this.titleInputElement = this.element.querySelector(
      "#title"
    )! as HTMLInputElement;
    this.descriptionInputElement = this.element.querySelector(
      "#description"
    )! as HTMLInputElement;
    this.peopleInputElement = this.element.querySelector(
      "#people"
    )! as HTMLInputElement;

    //? attach event listener to form
    this.configure();
  }

  renderContent(): void {}

  configure(): void {
    this.element.addEventListener("submit", this.handleSubmit);
  }

  //? fetch and validate form input
  private gatherInputs(): [string, string, number] | void {
    const titleInput = this.titleInputElement.value;
    const descriptionInput = this.descriptionInputElement.value;
    const peopleInput = this.peopleInputElement.value;

    const validatableTitle: Validatable = {
      value: titleInput,
      require: true,
    };
    const validatableDescription: Validatable = {
      value: descriptionInput,
      require: true,
      minLength: 5,
    };
    const validatablePeople: Validatable = {
      value: +peopleInput,
      require: true,
      min: 1,
      max: 6,
    };

    if (
      !validate(validatableTitle) ||
      !validate(validatableDescription) ||
      !validate(validatablePeople)
    ) {
      alert("Invalid Inputs");
      return;
    } else {
      return [titleInput, descriptionInput, +peopleInput];
    }
  }

  private clearInputs() {
    this.titleInputElement.value = "";
    this.descriptionInputElement.value = "";
    this.peopleInputElement.value = "";
  }

  @BindToClass
  private handleSubmit(e: Event) {
    e.preventDefault();
    const userInputs = this.gatherInputs();
    if (Array.isArray(userInputs)) {
      const [title, desc, people] = userInputs;
      projectState.addProject(title, desc, people);
      this.clearInputs();
    }
  }
}

const projectForm = new ProjectForm();
const projectActive = new ProjectList("active");
const projectFinish = new ProjectList("finished");
